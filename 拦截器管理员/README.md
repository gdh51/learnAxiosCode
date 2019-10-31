# InterceptorManager——拦截器管理对象

其实就是个事件处理队列(类似订阅者发布者模式)，它按的队列先进先出的顺序处理其中的函数，跳过空的(已经注销的)函数处理器。

```js
// 处理拦截器
function InterceptorManager() {
    this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
    this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
    });

    // 返回该拦截器处理函数的下标，以便注销
    return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
    if (this.handlers[id]) {
        this.handlers[id] = null;
    }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {

    // 按序遍历拦截器数组，调用其中不为空的拦截器对象
    utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
            fn(h);
        }
    });
};
```

从这里单独看还看不出这是个干什么玩意儿的。但是从`axios`的实例方法`request()`我们就可以知道，它用来拦截处理发送请求前配置和发送请求后的响应来对其进行一些操作，比如我们每发送一个请求之前都会使用一个等待图标提示用户，这时我们就可以封装在调用前的拦截器中，而不是单独在每次调用时去手动调用一次。
