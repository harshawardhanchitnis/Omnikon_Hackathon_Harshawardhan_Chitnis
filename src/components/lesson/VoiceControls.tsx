import {
  Pause,
  Play,
  Square,
  Volume2,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import type {
  LessonLanguage,
} from '@/lib/lessonLanguage'

type Props = {
  text: string
  language:
    LessonLanguage
}

function VoiceControls({
  text,
  language,
}: Props) {
  const [
    speaking,
    setSpeaking,
  ] =
    useState(false)

  const [
    paused,
    setPaused,
  ] =
    useState(false)

  const [
    rate,
    setRate,
  ] =
    useState(1)

  const supported =
    typeof window !==
      'undefined' &&
    'speechSynthesis' in
      window

  useEffect(() => {
    return () => {
      if (
        supported
      ) {
        window
          .speechSynthesis
          .cancel()
      }
    }
  }, [supported])

  function findVoice() {
    const voices =
      window
        .speechSynthesis
        .getVoices()

    const desired =
      language ===
      'hindi'
        ? 'hi-IN'
        : 'en-IN'

    return (
      voices.find(
        (voice) =>
          voice.lang ===
          desired,
      ) ??
      voices.find(
        (voice) =>
          voice.lang
            .toLowerCase()
            .startsWith(
              language ===
                'hindi'
                ? 'hi'
                : 'en',
            ),
      ) ??
      null
    )
  }

  function speak() {
    if (
      !supported ||
      !text.trim()
    ) {
      return
    }

    window
      .speechSynthesis
      .cancel()

    const utterance =
      new SpeechSynthesisUtterance(
        text,
      )

    utterance.rate =
      rate

    utterance.lang =
      language ===
      'hindi'
        ? 'hi-IN'
        : 'en-IN'

    const voice =
      findVoice()

    if (voice) {
      utterance.voice =
        voice
    }

    utterance.onend =
      () => {
        setSpeaking(false)
        setPaused(false)
      }

    utterance.onerror =
      () => {
        setSpeaking(false)
        setPaused(false)
      }

    setSpeaking(true)
    setPaused(false)

    window
      .speechSynthesis
      .speak(
        utterance,
      )
  }

  function pauseOrResume() {
    if (!supported) {
      return
    }

    if (paused) {
      window
        .speechSynthesis
        .resume()

      setPaused(false)

      return
    }

    window
      .speechSynthesis
      .pause()

    setPaused(true)
  }

  function stop() {
    if (!supported) {
      return
    }

    window
      .speechSynthesis
      .cancel()

    setSpeaking(false)
    setPaused(false)
  }

  if (!supported) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!speaking ? (
        <button
          type="button"
          onClick={speak}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e5efe2] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#176b43] transition-all hover:bg-[#d8e9d5]"
        >
          <Volume2 className="size-3.5" />

          {language ===
          'hindi'
            ? 'सुनें'
            : 'Listen'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={
              pauseOrResume
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#e5efe2] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#176b43]"
          >
            {paused ? (
              <Play className="size-3.5" />
            ) : (
              <Pause className="size-3.5" />
            )}

            {paused
              ? language ===
                'hindi'
                ? 'जारी रखें'
                : 'Resume'
              : language ===
                  'hindi'
                ? 'रोकें'
                : 'Pause'}
          </button>

          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dce4da] bg-white px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#657168]"
          >
            <Square className="size-3" />

            {language ===
            'hindi'
              ? 'बंद करें'
              : 'Stop'}
          </button>
        </>
      )}

      <select
        value={rate}
        onChange={(
          event,
        ) =>
          setRate(
            Number(
              event.target
                .value,
            ),
          )
        }
        className="h-8 rounded-lg border border-[#dce4da] bg-white px-2 text-[9px] font-bold text-[#657168] outline-none"
        aria-label={language === 'hindi' ? 'आवाज़ की गति' : 'Voice speed'}
      >
        <option value={0.85}>
          0.85×
        </option>

        <option value={1}>
          1×
        </option>

        <option value={1.15}>
          1.15×
        </option>
      </select>
    </div>
  )
}

export default VoiceControls