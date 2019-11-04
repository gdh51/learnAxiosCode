# 最初的初始化axios

当我们发起一个`axios`请求时，我们实际是调用的`axios`实例上的原型方法；`axios`暴露给我们的也不是其实例，而是其原型上的`Axios.prototype.request()`方法，所有其他的`HTTP`标准方法都是基于它进行简单包装后暴露出来的，那么这个`axios`函数是如何生成的呢，下面就看一下：

```js
function createInstance(defaultConfig) {
    var context = new Axios(defaultConfig);

    // 绑定request方法的this固定为该Axios实例
    var instance = bind(Axios.prototype.request, context);

    // Copy axios.prototype to instance
    // 复制Axios原型属性至实例，并绑定该axios实例作为上下文
    utils.extend(instance, Axios.prototype, context);

    // Copy context to instance
    // 复制上下文对象上的属性至该实例方法
    utils.extend(instance, context);

    return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
// 暴露该类，允许用户继承
axios.Axios = Axios;

// Factory for creating new instances
// 定义一个工厂函数允许创建新的实例
axios.create = function create(instanceConfig) {
    return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
// 在实例上挂载取消请求的相关逻辑
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.spread = require('./helpers/spread');

module.exports = axios;
```

通过以上代码，我们可以看出我们使用的`axios`其实是一个函数方法，在创建它的阶段，通过`defaultConfig`实例化了一个`Axios`对象，那么这个默认配置属性是什么呢？[点击查看](./默认配置)
___

了解了默认配置后，我们就可以直接来看一下`Axios`的[构造函数](./Axios构造函数)了(只用看构造函数，原型方法不用看，了解大概后返回即可)
___
这里的`instanceConfig`即我们刚刚介绍的`defaultConfig`，而下面的拦截器管理对象则是[一个任务队列对象](./默认配置)，它用于处理请求前和响应后的报文，当然我们也可以再其中添加业务逻辑。

## 发送请求

我们日常中发送请求无非是通过`axios()`或`axios.[method]()`这两种方式来发送请求，其实`axios.[method]()`就是基于`axios()`方法的封装，帮用户配置了默认的请求方法和一些参数而已。

`axios()`即[`Axios.prototype.request()`](../初始化axios/Axios构造函数/README.md#axiosprototyperequest%e4%b8%87%e6%81%b6%e8%b5%b7%e6%ba%90%e8%af%b7%e6%b1%82%e5%87%bd%e6%95%b0)，通过它浏览器会自动根据当前的环境选择发送请求的方式，期间还要处理响应、请求拦截器，期间还要发送请求。之后，我们再次调用`axios`时，始终使用的是同一个`axios`实例。

### 其他API

#### axios.all()——并行发送请求

很简单，就是`Promise.all()`方法的封装，当全部请求`resolved`后，会`resolved`掉该`promise`实例，有一个`reject`掉就会`reject`掉该`promise`实例(具体请自行学习`ES6 Promise`)：

```js
axios.all = function all(promises) {
    return Promise.all(promises);
};
```

#### axios.spread()——用于将请求发散

该函数只要用于数组的解构，将数组形式参数转换为单个的：

```js
function spread(callback) {
    return function wrap(arr) {
        return callback.apply(null, arr);
    };
};
```

举个例子：

```js
axios.all([axios.get('https://getman.cn/echo'), axios.get('https://getman.cn/echo')])
    .then(axios.spread(
        function (response1, response2) {
        // Both requests are now complete
    }));
```
