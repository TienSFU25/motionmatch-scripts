const indexSort = (arr) => {
    let arrWithIndex = arr.map((v, i) => {
        return {
            index: i,
            value: v
        };
    });

    arrWithIndex = arrWithIndex.sort((a, b) => {
        return a.value - b.value;
    });

    return arrWithIndex;
};

// move the stuff in arr2 using criterion in arr1
const dualSort = (arr1, arr2) => {
    let obj = arr1.map((v, i) => {
        return {
            a: arr1[i],
            b: arr2[i]
        };
    });

    let sorted = obj.sort((a, b) => a.a - b.a);
    return sorted.map(v => v.b);
};

// module.exports = indexSort;
module.exports = dualSort;