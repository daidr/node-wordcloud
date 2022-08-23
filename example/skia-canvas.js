// 引入 canvas 实现 (演示使用 skia-canvas)
// 你需要提前通过 `npm i skia-canvas` 安装 skia-canvas
const { Canvas } = require('skia-canvas');

// 引入 wordcloud 组件（若不传递 createCanvas 参数，则内部默认使用 node-canvas）
const WordCloud = require('..')((w, h) => new Canvas(w, h));

const fs = require('fs');

const list = [["你好", 165], ["爱情", 86], ["方式", 74], ["全部", 70], ["现在", 68], ["身份", 66], ["有意思", 65], ["Hello", 64], ["没有", 64], ["获取", 63], ["查看", 60], ["我们🥥", 58], ["你们", 57], ["rule", 57], ["欢迎", 56], ["I LOVE YOU", 56], ["一个", 53], ["了解", 53], ["到来", 53], ["大家", 53], ["可以啊", 53], ["继续", 52], ["如果", 51], ["哎嘿", 48], ["没办法", 48], ["有意思", 47], ["动作", 47], ["喜欢", 45], ["因为", 39], ["就是", 39], ["是不是", 39], ["知道", 38], ["事情", 37], ["成功", 37], ["获得", 37], ["不能", 36], ["然后", 36], ["信息", 35], ["希望", 34], ["确实", 34], ["问题", 34], ["个人", 33], ["已经", 33], ["明天", 33], ["他们", 32], ["处理", 32], ["都是", 31], ["朋友", 30], ["事实", 28], ["加入", 28], ["应该", 28], ["继续", 27], ["有人", 26], ["但是", 25], ["房屋", 25], ["还是", 25], ["不知", 24], ["自己", 24], ["不知道", 23], ["温迪", 23], ["今天", 22], ["直接", 22], ["一直", 21], ["犯罪", 21], ["节奏", 21], ["哪里", 20], ["lol", 20], ["这边", 20], ["see", 19], ["其他", 19]]

const list2 = [["Hello🤪", 165], ["MySQL", 86], ["Vue🍉", 74], ["ElasticSearch", 70], ["React", 68], ["MongoDB", 66], ["PostgreSQL", 65], ["Svelte", 64], ["Windicss", 64], ["Oracle", 63], ["Pure", 40]]

// 预定义一个调色盘（非必需，仅为了美观）
const colorPanel = ['#54b399', '#6092c0', '#d36086', '#9170b8', '#ca8eae', '#d6bf57', '#b9a888', '#da8b45', '#aa6556', '#e7664c']

const options = {
    gridSize: 8,                            // 设置网格大小，默认为8
    rotateRatio: 1,                         // 设置旋转比例，默认为 0.1
    rotationSteps: 7,                       // 设置旋转步数，默认为 14
    rotationRange: [-70, 70],               // 设置旋转范围，默认为 [-70, 70]
    backgroundColor: '#fff',                // 设置背景颜色，默认为 rgba(255,0,0,0.3)
    sizeRange: [18, 70],                    // 设置字体大小范围，默认为 [16, 68]
    color: function (word, weight) {        // 字体颜色（非必需，这里会为词汇随机挑选一种 colorPanel 中的颜色）
        return colorPanel[Math.floor(Math.random() * colorPanel.length)]
    },
    fontWeight: 'bold',                     // 字体粗细，默认为 'normal'
    fontFamily: `"PingFang SC", "Microsoft YaHei", "Segoe UI Emoji", "Segoe UI Emoji","Segoe UI Historic"`,
    shape: 'square'                         // 字体形状，默认为 'circle'
}


let st = Date.now()
const canvas = new Canvas(500, 500);
console.log(`create canvas cost ${Date.now() - st}ms`)
st = Date.now()
const wordcloud = WordCloud(canvas, { list, ...options })
console.log(`wordcloud init cost ${Date.now() - st}ms`)
st = Date.now()
wordcloud.draw()
console.log(`wordcloud draw cost ${Date.now() - st}ms`)
st = Date.now()

canvas.toBuffer().then(buffer => {
    console.log(`canvas to buffer cost ${Date.now() - st}ms`)
    st = Date.now()
    fs.writeFileSync('skia_wordcloud.png', buffer)
    console.log(`write file cost ${Date.now() - st}ms`)
})

setTimeout(async () => {
    let st = Date.now()
    wordcloud.updateList(list2)
    console.log(`update list cost ${Date.now() - st}ms`)

    st = Date.now()
    wordcloud.draw()
    console.log(`wordcloud draw cost ${Date.now() - st}ms`)

    st = Date.now()
    const buffer = await canvas.toBuffer()
    console.log(`canvas to buffer cost ${Date.now() - st}ms`)

    st = Date.now()
    fs.writeFileSync('skia_wordcloud_2.png', buffer)
    console.log(`write file cost ${Date.now() - st}ms`)
}, 3000)
