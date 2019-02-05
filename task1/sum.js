function sum(a) {
    if (sum.store === undefined)
    {
        sum.store = 0;
        var returnResult = function() {
            var result = sum.store;
            sum.store = 0;
            return result;
        };
        sum.toString = returnResult;
        sum.valueOf = returnResult;
    }
    sum.store += a;
    return sum;
}