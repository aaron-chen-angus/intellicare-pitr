# Artwork enhancement options

## Implemented free Gen AI feature

The report now includes **Enhance with AI**. It uses the open-source `Xenova/swin2SR-classical-sr-x2-64` image-to-image super-resolution model through Transformers.js. The model is lazy-loaded in the browser, tries WebGPU first, and falls back to the browser CPU path. The drawing is processed locally; no API key, hosted image upload, or paid model credits are required. The first run can take time because the model and ONNX runtime must download into the browser cache.

This is a genuine AI enhancement/upscaling pass rather than a CSS filter. It is designed to preserve the child's or participant's marks while improving detail and output resolution. Because it is browser ML, older devices may be slow or may fail to support the model; the app then offers the non-AI gallery finish as a fallback.

## Why the app does not silently use a hosted AI API

A hosted image-to-image service is easier to run, but it requires an authenticated user key or an external upload path. Pollinations' current API documentation says generation endpoints require a bearer secret key, and its reference-image parameter expects a public HTTP(S) image URL. Shipping a secret key in a GitHub Pages frontend would expose it. Uploading a personal drawing to a temporary public file host would also conflict with the app's privacy-first promise.

Hugging Face Inference Providers currently gives free users no included monthly credits; usage requires purchased credits or a paid plan. The browser model is therefore the free, keyless implementation chosen for this static app.

## Future optional hosted style transfer

A future server-backed style-transfer mode can be added behind an explicit user consent step, with a provider/key disclosure, a temporary upload, rate limits, and a deletion policy. That should remain separate from the local activity by default.

Sources:

- [Transformers.js image-to-image pipeline](https://huggingface.co/docs/transformers.js/api/pipelines)
- [Transformers.js image utilities](https://huggingface.co/docs/transformers.js/api/utils/image)
- [Hugging Face Inference Providers pricing](https://huggingface.co/docs/inference-providers/en/pricing)
- [Pollinations API authentication and image reference documentation](https://github.com/pollinations/pollinations/blob/main/APIDOCS.md)
