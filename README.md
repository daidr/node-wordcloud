# node-wordcloud ![npm version](https://img.shields.io/npm/v/node-wordcloud.svg) 

Tag cloud presentation for NodeJS (Based on [wordcloud2.js](https://github.com/timdream/wordcloud2.js))



## Installation

```bash
npm install node-wordcloud
```

## Usage

```javascript
const { createCanvas } = require('canvas');
const WordCloud = require('node-wordcloud')();

const canvas = createCanvas(500, 500);

// Array of words [text: String, weight: Number][]
// The weight of word isn't the absolute size of word, the real size will be automatically calculated based on options.sizeRange
const list = [['word', 150], ['hello', 140], ['world', 130], ['test', 90]];

const wordcloud = WordCloud(canvas, { list });

// you should call draw() to draw the wordcloud manually
wordcloud.draw();

const buffer = canvas.toBuffer();

// you can use the wordcloud.updateList() to update the word list
// wordcloud.updateList([['word', 150], ['hello', 140], ['world', 130], ['test', 90]]);
// wordcloud.draw();
```

## Example

See [example](./example) folder for more examples.

## Options

Support most of options of [wordcloud2.js](https://github.com/timdream/wordcloud2.js), except for:

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

In `wordcloud2.js`, you can import module by `const WordCloud = require('wordcloud2')`, but in node-wordcloud, it will be `const WordCloud = require('node-wordcloud')()`, you can choose the canvas implementation you want to use by passing `createCanvas` function, here here some examples:

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