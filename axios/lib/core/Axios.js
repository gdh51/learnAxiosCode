'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {

    // 设置实例的默认配置
    this.defaults = instanceConfig;

    // 为请求和响应对象设置拦截器
    this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
    };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {

    // Allow for axios('example/url'[, config]) a la fetch API
    // 将参数处理为单个配置对象
    if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
    } else {
        config = config || {};
    }

    // 合并配置，优先保留用户自定义配置(即config)
    config = mergeConfig(this.defaults, config);

    // 提取HTTP请求方法，默认为get
    config.method = config.method ? config.method.toLowerCase() : 'get';

    // Hook up interceptors middleware
    var chain = [dispatchRequest, undefined];
    var promise = Promise.resolve(config);

    // 调用所有的请求拦截器，将拦截器处理函数加入到调用链发送请求前
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    // 调用所有的响应拦截器，将拦截器处理函数加入到返回响应之后
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
    });

    // 按序调用拦截器发送请求
    while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
};

// 接收一个配置对象，会修改默认配置，返回最终配置的URI字符串
Axios.prototype.getUri = function getUri(config) {

    // 修改默认配置(同名会覆盖原配置)
    config = mergeConfig(this.defaults, config);
    return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
// 为请求方法提供别名
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {

    // 包装以上无请求主体方法至Axios原型对象(默认不提供请求主体的参数)
    Axios.prototype[method] = function (url, config) {
        return this.request(utils.merge(config || {}, {
            method: method,
            url: url
        }));
    };
});

// 包装有请求主体的方法，但参数的位置做有限制
utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
    /*eslint func-names:0*/
    Axios.prototype[method] = function (url, data, config) {
        return this.request(utils.merge(config || {}, {
            method: method,
            url: url,
            data: data
        }));
    };
});

module.exports = Axios;