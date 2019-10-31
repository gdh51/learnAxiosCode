'use strict';

var utils = require('./../utils');

function encode(val) {
    return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {

    if (!params) {
        return url;
    }

    var serializedParams;

    // 用户自定义的序列化函数
    if (paramsSerializer) {
        serializedParams = paramsSerializer(params);

    // 是否为URLSearchParams对象，是就直接取字符串即可
    } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();

    // 否则序列化参数对象
    } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
            if (val === null || typeof val === 'undefined') {
                return;
            }

            if (utils.isArray(val)) {
                key = key + '[]';
            } else {
                val = [val];
            }

            utils.forEach(val, function parseValue(v) {
                if (utils.isDate(v)) {
                    v = v.toISOString();
                } else if (utils.isObject(v)) {
                    v = JSON.stringify(v);
                }
                parts.push(encode(key) + '=' + encode(v));
            });
        });

        serializedParams = parts.join('&');
    }

    if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
            url = url.slice(0, hashmarkIndex);
        }

        // 原始url是否已包含查询字符串，按情况将序列化后参数拼接上去
        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
    }

    return url;
};