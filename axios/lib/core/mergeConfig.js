'use strict';

var utils = require('../utils');

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1 系统默认配置
 * @param {Object} config2 用户定义配置
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {

    // 检查用户传入配置情况
    config2 = config2 || {};

    // 最终结果
    var config = {};

    // 针对url/method/params/data的处理，将它们添加至默认配置(未定义则不做处理)
    utils.forEach(['url', 'method', 'params', 'data'], function valueFromConfig2(prop) {
        if (typeof config2[prop] !== 'undefined') {
            config[prop] = config2[prop];
        }
    });

    // 增对headers/auth/proxy三个字段
    utils.forEach(['headers', 'auth', 'proxy'], function mergeDeepProperties(prop) {

        // 用户定义该参数采用的对象形式时，与默认对象合并并返回一个新的配置对象
        if (utils.isObject(config2[prop])) {
            config[prop] = utils.deepMerge(config1[prop], config2[prop]);

            // 只要用户定义的该属性值存在，则添加至最终配置对象上
        } else if (typeof config2[prop] !== 'undefined') {
            config[prop] = config2[prop];

            // 剩余情况则是用户未自定义属性时，则使用默认配置
        } else if (utils.isObject(config1[prop])) {
            config[prop] = utils.deepMerge(config1[prop]);
        } else if (typeof config1[prop] !== 'undefined') {
            config[prop] = config1[prop];
        }
    });

    // 其余字段优先添加用户自定义配置，否则添加默认配置
    utils.forEach([
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'maxContentLength',
        'validateStatus', 'maxRedirects', 'httpAgent', 'httpsAgent', 'cancelToken',
        'socketPath'
    ], function defaultToConfig2(prop) {
        if (typeof config2[prop] !== 'undefined') {
            config[prop] = config2[prop];
        } else if (typeof config1[prop] !== 'undefined') {
            config[prop] = config1[prop];
        }
    });

    return config;
};