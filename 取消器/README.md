# Cancel群

在`Axios`中有两个类专门用于来处理取消的请求，分别为`Cancel`、`CancelToken`

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

该对象主要用来取消某个操作，它的构造函数上挂载有一个`source`方法, 来生成并保留本次取消的函数和消息处理对象：

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
```

从这个构造函数我们可以看出，它会在自身绑定一个`pending`状态的`promise`实例，并且它接受一个执行函数，并将一个用于生成取消信息的函数作为参数传入其中；当该函数调用时，会`resolved`掉这个`promise`

### CancelToken.prototype.throwIfRequested()——抛出错误

该方法用于抛出错误来`reject`掉这次`Promise`。

```js
/**
 * Throws a `Cancel` if cancellation has been requested.
 * 直接抛出错误来reject掉这次promise
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
    if (this.reason) {
        throw this.reason;
    }
};
```

### CancelToken.source()——生成一个CancelToken对象

该函数用于生成一个一次性的取消令牌函数，它暴露了一个接口，其中包含一个取消函数，用于取消请求。

```js
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

## 如何使用一个取消器来取消请求的发送

首先我们需要从`axios`请求函数上找到生成`CancelToken`对象的接口函数

```js
const CancelToken = axios.CancelToken;
let source = CancelToken.source();
```

首先我们需要再自定义配置中，将该`source.token`挂载到`config`上：

```js
axios.get(URL, {
    cancelToken: source.token
});
```

从发送[请求函数](../初始化axios/调度请求函数/README.md)的代码我们可以看到，要想取消请求必须要在发送请求之前，这里就有两种做法：

- 利用`eventLoop`，因为请求原理是`Promise`，会再宏任务结束阶段调用，所以我们在第一个宏任务阶段取消即可

```js
axios.get(URL, {
    cancelToken: source.token
});
source.cancel('cancel msg');
```

- 利用请求拦截器，在拦截器中取消

```js
axios.interceptors.request.use(config => {
    cancelToken.cancel('cancel msg');
    return config;
};

axios.get(URL, {
    cancelToken: source.token
});
```

在我们的`source.token`上还存在一个`promise`实例，在取消后会被`reslove`，可以继续用它来处理相关逻辑：

```js
source.token.promise.then(reason => {
    // 处理拒绝后的逻辑
});
```

### 自定义一个取消函数

通过`CancelToken`构造函数，我们可以看出，我可以创建一个自定义的`executor`函数来作为接收`cancel`函数的容器，再在其他地方调用该函数取消请求即可：

```js
let cancel;

new CancelToken(c => cancel = c);

cancel('cancel msg')
```
