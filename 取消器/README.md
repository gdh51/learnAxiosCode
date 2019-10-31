# Cancel群

在Axios中有两个类专门用于来处理取消的请求，分别为`Cancel`、`CancelToken`

## isCancel——检测是否已取消

```js
function isCancel(value) {
    return !!(value && value.__CANCEL__);
};
```

## Cancel——取消的消息对象

该类主要用于在取消请求时，报出取消相关的信息，源码比较简单，一目了然：

```js
/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 * 会在操作取消时被抛出的对象
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;
```

## CancelToken——取消请求对象接口

该对象主要用来取消某个操作，它的构造函数上挂载有一个source方法, 来生成并保留本次取消的函数和消息处理对象：

```js
var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
    if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
    }

    var resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
    });

    var token = this;
    executor(function cancel(message) {
        if (token.reason) {

            // Cancellation has already been requested
            // 取消的请求已建立时，直接返回
            return;
        }

        // resolve Promise实例并生成取消消息对象
        token.reason = new Cancel(message);
        resolvePromise(token.reason);
    });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 * 抛出取消信息
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
    if (this.reason) {
        throw this.reason;
    }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 * 返回一个新的取消接口对象，里面包括该实例和取消函数
 */
CancelToken.source = function source() {
    var cancel;
    var token = new CancelToken(function executor(c) {
        cancel = c;
    });
    return {
        token: token,
        cancel: cancel
    };
};
```
