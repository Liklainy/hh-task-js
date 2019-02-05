function getArguments(func) {
    const ARROW = true;
    const FUNC_ARGS = ARROW ? /^(function)?\s*[^\(]*\(\s*([^\)]*)\)/m : /^(function)\s*[^\(]*\(\s*([^\)]*)\)/m;
    const FUNC_ARG_SPLIT = /,/;
    const FUNC_ARG = /^\s*(_?)(.+?)\1\s*$/;
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

    return ((func || '').toString().replace(STRIP_COMMENTS, '').match(FUNC_ARGS) || ['', '', ''])[2]
        .split(FUNC_ARG_SPLIT)
        .map(function(arg) {
            return arg.replace(FUNC_ARG, function(all, underscore, name) {
                return name.split('=')[0].trim();
            });
        })
        .filter(String);
}

const lazyGraph = {
    receiveGraph(graph) {
        this.graph = graph;
        this.callstack = [];
        this.results = {};
        return this;
    },
   
    calcVertex(vertex) {
        if (!this.graph.hasOwnProperty(vertex) || typeof this.graph[vertex] !== "function")
            throw Error("Graph node does not exist or is not a function");
        if (this.callstack.indexOf(vertex) >= 0)
            throw Error("Recursive call");
        if (this.results.hasOwnProperty(vertex))
            return this.results[vertex];
        this.callstack.push(vertex);
        const parsedArgs = getArguments(this.graph[vertex]);
        const args = parsedArgs.map((v, i, a) => this.calcVertex(v));
        const result = this.graph[vertex].apply(this, args);
        this.callstack.pop();
        this.results[vertex] = result;
        return result;
    }
}

const eagerGraph = {
    receiveGraph(graph) {
        this.lazyGraph = lazyGraph.receiveGraph(graph);
        for (let vertex in graph)
            this.lazyGraph.calcVertex(vertex);
        return this;
    },
   
    calcVertex(vertex) {
        return this.lazyGraph.calcVertex(vertex);
    }
}

const myAmazingGraph = {
    n: (xs) => xs.length,
    m: (xs, n) => xs.reduce((store, item) => item + store, 0) / n,
    m2: (xs, n) => xs.reduce((store, item) => item * store, 1) / n,
    v: (m, m2) => m*m - m2,
    xs: () => [1, 2, 3]
}

const myRecursiveGraph = {
    n: (a) => a,  
    b: (n) => n,
    z: (x) => x,
    x: (z) => z
}

console.log(lazyGraph.receiveGraph(myAmazingGraph).calcVertex('m2'));
//console.log(lazyGraph.receiveGraph(myRecursiveGraph).calcVertex('x'));

console.log(eagerGraph.receiveGraph(myAmazingGraph).calcVertex('m2'));
//console.log(eagerGraph.receiveGraph(myRecursiveGraph).calcVertex('x'));