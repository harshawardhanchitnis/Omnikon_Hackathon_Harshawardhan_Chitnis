# Product screenshots

Build once, run the verified production preview in one terminal, then capture the standard evidence set from a second terminal:

```bash
pnpm build
pnpm preview
```

```bash
pnpm screenshots
```

Set `CHALKBOX_SCREENSHOT_URL` to capture from the final deployed origin instead. Expected outputs are:

1. landing;
2. teacher dashboard;
3. full plan preview;
4. private analytics;
5. Quick Brief;
6. assessment bank;
7. Teach Mode;
8. moderated community.

The same eight files are generated once by the desktop Playwright project in GitHub Actions and uploaded as the `chalkbox-product-screenshots` workflow artifact.
