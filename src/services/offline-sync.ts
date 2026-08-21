import type {
  LessonPlan,
  OfflineEntityType,
  OfflineMutation,
  OfflineMutationType,
  Reflection,
  SyncConflict,
  TeachingSession
} from "@chalkbox/contracts";
import { offlineDb } from "@/lib/offline-db";
import { supabase } from "@/lib/supabase";
import { uid } from "@/lib/utils";
import {
  loadReflectionRemoteById,
  loadSessionRemoteById,
  saveReflectionRemote,
  saveSessionRemote
} from "@/services/activity-repository";
import { loadPlanRemoteById, removePlanRemote, savePlanRemote } from "@/services/plan-repository";

type SyncEntity = LessonPlan | Reflection | TeachingSession;

export function createOfflineMutation(
  entityType: OfflineEntityType,
  entityId: string,
  mutationType: OfflineMutationType,
  payload: unknown,
  baseVersion: number
): OfflineMutation {
  return {
    id: uid("mutation"),
    entityId,
    entityType,
    mutationType,
    payload: structuredClone(payload),
    baseVersion,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: "pending"
  };
}

export function hasVersionConflict(baseVersion: number, cloudVersion?: number) {
  if (baseVersion === 0) return cloudVersion !== undefined;
  return cloudVersion !== baseVersion;
}

async function loadRemote(mutation: OfflineMutation): Promise<SyncEntity | null> {
  if (mutation.entityType === "lesson-plan") return loadPlanRemoteById(mutation.entityId);
  if (mutation.entityType === "teaching-session") return loadSessionRemoteById(mutation.entityId);
  return loadReflectionRemoteById(mutation.entityId);
}

async function saveRemote(mutation: OfflineMutation) {
  if (mutation.entityType === "lesson-plan") {
    if (mutation.mutationType === "delete") return removePlanRemote(mutation.entityId);
    return savePlanRemote(mutation.payload as LessonPlan, mutation.baseVersion);
  }
  if (mutation.entityType === "teaching-session") {
    return saveSessionRemote(mutation.payload as TeachingSession, mutation.baseVersion);
  }
  return saveReflectionRemote(mutation.payload as Reflection, mutation.baseVersion);
}

async function recordConflict(mutation: OfflineMutation, remote: SyncEntity | null) {
  const local = mutation.payload as SyncEntity;
  const conflict: SyncConflict = {
    id: uid("conflict"),
    mutationId: mutation.id,
    entityId: mutation.entityId,
    entityType: mutation.entityType,
    localPayload: structuredClone(mutation.payload),
    cloudPayload: remote ? structuredClone(remote) : null,
    localVersion: local.version,
    cloudVersion: remote?.version ?? 0,
    detectedAt: new Date().toISOString()
  };
  await offlineDb.transaction("rw", [offlineDb.mutations, offlineDb.conflicts], async () => {
    await offlineDb.conflicts.put(conflict);
    await offlineDb.mutations.update(mutation.id, { status: "conflict" });
  });
  return conflict;
}

export async function replayMutationQueue() {
  if (!supabase || typeof navigator === "undefined" || !navigator.onLine) return;
  const mutations = await offlineDb.mutations
    .where("status")
    .anyOf("pending", "failed")
    .sortBy("timestamp");
  for (const mutation of mutations) {
    await offlineDb.mutations.update(mutation.id, { status: "syncing" });
    try {
      const remote = await loadRemote(mutation);
      if (
        mutation.mutationType !== "delete" &&
        hasVersionConflict(mutation.baseVersion, remote?.version)
      ) {
        await recordConflict(mutation, remote);
        continue;
      }
      await saveRemote(mutation);
      await offlineDb.mutations.delete(mutation.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SYNC_FAILED";
      if (message === "SYNC_VERSION_CONFLICT") {
        await recordConflict(mutation, await loadRemote(mutation));
        continue;
      }
      await offlineDb.mutations.update(mutation.id, {
        status: "failed",
        retryCount: mutation.retryCount + 1,
        errorCode: message.slice(0, 120)
      });
    }
  }
}

function withVersion<T extends SyncEntity>(entity: T, version: number): T {
  const now = new Date().toISOString();
  return { ...structuredClone(entity), version, updatedAt: now } as T;
}

async function putLocal(entityType: OfflineEntityType, entity: SyncEntity) {
  if (entityType === "lesson-plan") return offlineDb.plans.put(entity as LessonPlan);
  if (entityType === "teaching-session") {
    return offlineDb.sessions.put(entity as TeachingSession);
  }
  return offlineDb.reflections.put(entity as Reflection);
}

async function deleteLocal(entityType: OfflineEntityType, entityId: string) {
  if (entityType === "lesson-plan") return offlineDb.plans.delete(entityId);
  if (entityType === "teaching-session") return offlineDb.sessions.delete(entityId);
  return offlineDb.reflections.delete(entityId);
}

export async function resolveSyncConflict(
  conflictId: string,
  resolution: "keep-local" | "keep-cloud" | "duplicate-both"
) {
  const conflict = await offlineDb.conflicts.get(conflictId);
  if (!conflict || conflict.resolvedAt) return;
  const mutation = await offlineDb.mutations.get(conflict.mutationId);
  const local = conflict.localPayload as SyncEntity;
  const cloud = conflict.cloudPayload as SyncEntity | null;

  await offlineDb.transaction(
    "rw",
    [
      offlineDb.plans,
      offlineDb.sessions,
      offlineDb.reflections,
      offlineDb.mutations,
      offlineDb.conflicts
    ],
    async () => {
      if (resolution === "keep-cloud") {
        if (cloud) await putLocal(conflict.entityType, cloud);
        else await deleteLocal(conflict.entityType, conflict.entityId);
        if (mutation) await offlineDb.mutations.delete(mutation.id);
      }

      if (resolution === "keep-local") {
        const nextLocal = withVersion(local, conflict.cloudVersion + 1);
        await putLocal(conflict.entityType, nextLocal);
        const nextMutation = createOfflineMutation(
          conflict.entityType,
          conflict.entityId,
          conflict.cloudVersion === 0 ? "create" : "update",
          nextLocal,
          conflict.cloudVersion
        );
        if (mutation) await offlineDb.mutations.delete(mutation.id);
        await offlineDb.mutations.put(nextMutation);
      }

      if (resolution === "duplicate-both") {
        if (cloud) await putLocal(conflict.entityType, cloud);
        const duplicateId = uid(
          conflict.entityType === "lesson-plan"
            ? "plan"
            : conflict.entityType === "teaching-session"
              ? "session"
              : "reflection"
        );
        const duplicate = withVersion({ ...local, id: duplicateId }, 1);
        if (conflict.entityType === "lesson-plan") {
          (duplicate as LessonPlan).title = `${(duplicate as LessonPlan).title} — offline copy`;
          (duplicate as LessonPlan).parentPlanId = conflict.entityId;
          (duplicate as LessonPlan).isPublic = false;
          delete (duplicate as LessonPlan).publicSlug;
        }
        await putLocal(conflict.entityType, duplicate);
        if (mutation) await offlineDb.mutations.delete(mutation.id);
        await offlineDb.mutations.put(
          createOfflineMutation(conflict.entityType, duplicateId, "create", duplicate, 0)
        );
      }

      await offlineDb.conflicts.update(conflict.id, {
        resolution,
        resolvedAt: new Date().toISOString()
      });
    }
  );
}

export async function queueMutation(mutation: OfflineMutation) {
  await offlineDb.mutations.put(mutation);
  void replayMutationQueue();
}
