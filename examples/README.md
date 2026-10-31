# Examples

Install the dependencies and build the SDK from the repository root:

```sh
npm install
npm run build
```

Set `SCREENSHOTSCOUT_ACCESS_KEY`, then run an example:

```sh
npm exec tsx -- examples/binary.ts
npm exec tsx -- examples/json.ts
npm exec tsx -- examples/capture-url.ts
```

`capture-url.ts` also reads `SCREENSHOTSCOUT_SECRET_KEY` and signs the URL when it's set.
