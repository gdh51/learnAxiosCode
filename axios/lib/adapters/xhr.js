'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');

module.exports = function xhrAdapter(config) {
    return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        // 如果为FormData对象，则不设置Content-Type属性，浏览器会自动设置
        if (utils.isFormData(requestData)) {
            delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        // 用户配置HTTP基础认证信息时，将其添加到报文头部
        if (config.auth) {
            var username = config.auth.username || '';
            var password = config.auth.password || '';

            // btoa为将二进制数据转换为ASCLL🐎
            requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        // 设置请求参数地址、方式
        request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        // 设置请求超时时间
        request.timeout = config.timeout;

        // Listen for ready state
        // 处理响应信息
        request.onreadystatechange = function handleLoad() {

            // 不成功的请求，直接返回
            if (!request || request.readyState !== 4) {
                return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            // 有一个意外情况：大多数浏览器会在文件协议成功返回时，返回0状态码，下面为处理这种情况
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
                return;
            }

            // Prepare the response
            // 将响应报文头转换为对象形式
            var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;

            // 获取响应的文本信息
            var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;

            // 包装响应对象
            var response = {
                data: responseData,
                status: request.status,
                statusText: request.statusText,
                headers: responseHeaders,
                config: config,
                request: request
            };

            // 响应成功时resolve掉该promise，否则reject掉
            settle(resolve, reject, response);

            // Clean up request
            request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        // 处理主动取消请求的情况
        request.onabort = function handleAbort() {
            if (!request) {
                return;
            }

            reject(createError('Request aborted', config, 'ECONNABORTED', request));

            // Clean up request
            request = null;
        };

        // Handle low level network errors
        // 处理网络错误的情况
        request.onerror = function handleError() {

            // Real errors are hidden from us by the browser
            // onerror should only fire if it's a network error
            // 该错误仅会在网络错误时报出
            reject(createError('Network Error', config, null, request));

            // Clean up request
            request = null;
        };

        // Handle timeout
        // 处理超时事件
        request.ontimeout = function handleTimeout() {
            reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
                request));

            // Clean up request
            request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        // 添加xsrf头，但只会在标准浏览器环境下
        if (utils.isStandardBrowserEnv()) {

            // 一些处理cookie的方法
            var cookies = require('./../helpers/cookies');

            // Add xsrf header
            // 跨域时，添加xsrf头
            var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
                cookies.read(config.xsrfCookieName) :
                undefined;

            if (xsrfValue) {
                requestHeaders[config.xsrfHeaderName] = xsrfValue;
            }
        }

        // Add headers to the request
        // 将头部信息添加至xhr对象
        if ('setRequestHeader' in request) {
            utils.forEach(requestHeaders, function setRequestHeader(val, key) {
                if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
                    // Remove Content-Type if data is undefined
                    delete requestHeaders[key];
                } else {
                    // Otherwise add header to the request
                    request.setRequestHeader(key, val);
                }
            });
        }

        // Add withCredentials to request if needed
        // 设置跨域携带凭证时，添加凭证信息
        if (config.withCredentials) {
            request.withCredentials = true;
        }

        // Add responseType to request if needed
        // 添加响应类型
        if (config.responseType) {
            try {
                request.responseType = config.responseType;
            } catch (e) {
                // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
                // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
                if (config.responseType !== 'json') {
                    throw e;
                }
            }
        }

        // Handle progress if needed
        // 暴露一个progress事件接口
        if (typeof config.onDownloadProgress === 'function') {
            request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        // 暴露一个upload事件接口（但不是所有浏览器都支持）
        if (typeof config.onUploadProgress === 'function' && request.upload) {
            request.upload.addEventListener('progress', config.onUploadProgress);
        }

        // 如果取消，请求，那么就直接reject掉该次请求，并报错
        if (config.cancelToken) {
            // Handle cancellation
            config.cancelToken.promise.then(function onCanceled(cancel) {
                if (!request) {
                    return;
                }

                request.abort();
                reject(cancel);
                // Clean up request
                request = null;
            });
        }

        if (requestData === undefined) {
            requestData = null;
        }

        // Send the request
        // 发送请求
        request.send(requestData);
    });
};