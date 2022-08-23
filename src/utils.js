const NumberLinearMap = (value, valueExtent, sizeRange) => {
    const [min, max] = valueExtent
    const [minSize, maxSize] = sizeRange
    const scale = (max - min) / (maxSize - minSize)
    return minSize + (value - min) / scale
}

const getDataValueExtent = data => {
    const values = data.map(d => d[1])
    return [Math.min(...values), Math.max(...values)]
}

const shuffleArray = arr => {
    for (let j, x, i = arr.length; i;) {
        j = Math.floor(Math.random() * i)
        x = arr[--i]
        arr[i] = arr[j]
        arr[j] = x
    }
    return arr
}

module.exports = {
    NumberLinearMap,
    getDataValueExtent,
    shuffleArray
}