'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {

    // 该值默认为空
    if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
    }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {

    // 用户配置有取消对象时，抛出取消信息
    throwIfCancellationRequested(config);

    // Support baseURL config
    // 支持基准URL，当设置有基准URL且是相对URL时，合并取出绝对URL
    if (config.baseURL && !isAbsoluteURL(config.url)) {
        config.url = combineURLs(config.baseURL, config.url);
    }

    // Ensure headers exist
    config.headers = config.headers || {};

    // Transform request data
    // 处理data和headers中的数据
    config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
    );

    // Flatten headers 扁平化头部信息
    config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers || {}
    );

    // 移除多余的头部信息配置
    utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
            delete config.headers[method];
        }
    );

    // 选择用于请求的适配器
    var adapter = config.adapter || defaults.adapter;

    // 直接通过适配器发送请求
    return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        // 转换响应信息格式
        response.data = transformData(
            response.data,
            response.headers,
            config.transformResponse
        );

        return response;
    }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
            throwIfCancellationRequested(config);

            // Transform response data
            if (reason && reason.response) {
                reason.response.data = transformData(
                    reason.response.data,
                    reason.response.headers,
                    config.transformResponse
                );
            }
        }

        return Promise.reject(reason);
    });
};