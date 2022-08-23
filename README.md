# node-wordcloud

Tag cloud presentation for NodeJS (Based on [wordcloud2.js](https://github.com/timdream/wordcloud2.js))

## Installation

```bash
npm install node-wordcloud
```

## Example

See [example](./example) folder for more examples.

## Options

Support most of options of [wordcloud2.js](https://github.com/timdream/wordcloud2.js), but some options are not supported:

- `clearCanvas`
- `weightFactor`
- `wait`
- `minRotation`
- `maxRotation`
- `classes`
- `hover`
- `click`

Also we added some options:

```diff
+ {
+     sizeRange: [16, 68], 
+     rotationRange: [-70, 70],
+ }
```

## API

We remove the support for generating word cloud in svg format, because some canvas implementation already allow to generate svg directly (such as [node-canvas](https://github.com/Automattic/node-canvas)).

This module will not draw word cloud automatically, you need to call `wordcloud.draw()` to draw word cloud. See example for more details.

You can use `wordcloud.updateList(list: Array<[text: String, weight: Number]>)` to update word list. See example for more details.

In `wordcloud2.js`, you can import module like `const WordCloud = require('wordcloud2')`, but in node-wordcloud, you need to import module like `const WordCloud = require('node-wordcloud')()`, you can choose the canvas implementation you want to use by passing `createCanvas` function, here here some examples:

```javascript
// use node-canvas default
const WordCloud = require('node-wordcloud')();

// use node-canvas
const { createCanvas } = require('canvas');
const WordCloud = require('node-wordcloud')(createCanvas);

// use skia-canvas
const { Canvas } = require('skia-canvas');
const WordCloud = require('node-wordcloud')((w, h) => new Canvas(w, h));

// etc.
```

## LICENSE

MIT License