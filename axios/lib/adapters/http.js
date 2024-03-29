'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var http = require('http');
var https = require('https');
var httpFollow = require('follow-redirects').http;
var httpsFollow = require('follow-redirects').https;
var url = require('url');
var zlib = require('zlib');
var pkg = require('./../../package.json');
var createError = require('../core/createError');
var enhanceError = require('../core/enhanceError');

var isHttps = /https:?/;

/*eslint consistent-return:0*/
module.exports = function httpAdapter(config) {
    return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
        var timer;
        var resolve = function resolve(value) {
            clearTimeout(timer);
            resolvePromise(value);
        };
        var reject = function reject(value) {
            clearTimeout(timer);
            rejectPromise(value);
        };
        var data = config.data;
        var headers = config.headers;

        // Set User-Agent (required by some servers)
        // Only set header if it hasn't been set in config
        // See https://github.com/axios/axios/issues/69
        // 在User-Agent字段存在时，不进行重写(这个字段在部分服务器中需要)
        if (!headers['User-Agent'] && !headers['user-agent']) {
            headers['User-Agent'] = 'axios/' + pkg.version;
        }

        // 对数据类型进行转换，要么为二进制或文本
        if (data && !utils.isStream(data)) {
            if (Buffer.isBuffer(data)) {
                // Nothing to do...
            } else if (utils.isArrayBuffer(data)) {
                data = Buffer.from(new Uint8Array(data));
            } else if (utils.isString(data)) {
                data = Buffer.from(data, 'utf-8');
            } else {
                return reject(createError(
                    'Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream',
                    config
                ));
            }

            // Add Content-Length header if data exists
            // 设置Content-Length字段
            headers['Content-Length'] = data.length;
        }

        // HTTP basic authentication
        // 处理HTTP基础认证
        var auth = undefined;
        if (config.auth) {
            var username = config.auth.username || '';
            var password = config.auth.password || '';
            auth = username + ':' + password;
        }

        // Parse url
        // 解析URL
        var parsed = url.parse(config.url);
        var protocol = parsed.protocol || 'http:';

        // 如果URL中存在用户认证，则删除手动配置的
        if (!auth && parsed.auth) {
            var urlAuth = parsed.auth.split(':');
            var urlUsername = urlAuth[0] || '';
            var urlPassword = urlAuth[1] || '';
            auth = urlUsername + ':' + urlPassword;
        }

        if (auth) {
            delete headers.Authorization;
        }

        // 确认协议方案
        var isHttpsRequest = isHttps.test(protocol);
        var agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;

        var options = {
            path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ''),
            method: config.method.toUpperCase(),
            headers: headers,
            agent: agent,
            auth: auth
        };

        // 设置URL端口和主机名
        if (config.socketPath) {
            options.socketPath = config.socketPath;
        } else {
            options.hostname = parsed.hostname;
            options.port = parsed.port;
        }

        var proxy = config.proxy;
        if (!proxy && proxy !== false) {
            var proxyEnv = protocol.slice(0, -1) + '_proxy';
            var proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
            if (proxyUrl) {
                var parsedProxyUrl = url.parse(proxyUrl);
                var noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
                var shouldProxy = true;

                if (noProxyEnv) {
                    var noProxy = noProxyEnv.split(',').map(function trim(s) {
                        return s.trim();
                    });

                    shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
                        if (!proxyElement) {
                            return false;
                        }
                        if (proxyElement === '*') {
                            return true;
                        }
                        if (proxyElement[0] === '.' &&
                            parsed.hostname.substr(parsed.hostname.length - proxyElement.length) === proxyElement &&
                            proxyElement.match(/\./g).length === parsed.hostname.match(/\./g).length) {
                            return true;
                        }

                        return parsed.hostname === proxyElement;
                    });
                }


                if (shouldProxy) {
                    proxy = {
                        host: parsedProxyUrl.hostname,
                        port: parsedProxyUrl.port
                    };

                    if (parsedProxyUrl.auth) {
                        var proxyUrlAuth = parsedProxyUrl.auth.split(':');
                        proxy.auth = {
                            username: proxyUrlAuth[0],
                            password: proxyUrlAuth[1]
                        };
                    }
                }
            }
        }

        if (proxy) {
            options.hostname = proxy.host;
            options.host = proxy.host;
            options.headers.host = parsed.hostname + (parsed.port ? ':' + parsed.port : '');
            options.port = proxy.port;
            options.path = protocol + '//' + parsed.hostname + (parsed.port ? ':' + parsed.port : '') + options.path;

            // Basic proxy authorization
            if (proxy.auth) {
                var base64 = Buffer.from(proxy.auth.username + ':' + proxy.auth.password, 'utf8').toString('base64');
                options.headers['Proxy-Authorization'] = 'Basic ' + base64;
            }
        }

        var transport;
        var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
        if (config.transport) {
            transport = config.transport;
        } else if (config.maxRedirects === 0) {
            transport = isHttpsProxy ? https : http;
        } else {
            if (config.maxRedirects) {
                options.maxRedirects = config.maxRedirects;
            }
            transport = isHttpsProxy ? httpsFollow : httpFollow;
        }

        if (config.maxContentLength && config.maxContentLength > -1) {
            options.maxBodyLength = config.maxContentLength;
        }

        // Create the request
        var req = transport.request(options, function handleResponse(res) {
            if (req.aborted) return;

            // uncompress the response body transparently if required
            var stream = res;
            switch (res.headers['content-encoding']) {
                /*eslint default-case:0*/
                case 'gzip':
                case 'compress':
                case 'deflate':
                    // add the unzipper to the body stream processing pipeline
                    stream = (res.statusCode === 204) ? stream : stream.pipe(zlib.createUnzip());

                    // remove the content-encoding in order to not confuse downstream operations
                    delete res.headers['content-encoding'];
                    break;
            }

            // return the last request in case of redirects
            var lastRequest = res.req || req;

            var response = {
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: res.headers,
                config: config,
                request: lastRequest
            };

            if (config.responseType === 'stream') {
                response.data = stream;
                settle(resolve, reject, response);
            } else {
                var responseBuffer = [];
                stream.on('data', function handleStreamData(chunk) {
                    responseBuffer.push(chunk);

                    // make sure the content length is not over the maxContentLength if specified
                    if (config.maxContentLength > -1 && Buffer.concat(responseBuffer).length > config.maxContentLength) {
                        stream.destroy();
                        reject(createError('maxContentLength size of ' + config.maxContentLength + ' exceeded',
                            config, null, lastRequest));
                    }
                });

                stream.on('error', function handleStreamError(err) {
                    if (req.aborted) return;
                    reject(enhanceError(err, config, null, lastRequest));
                });

                stream.on('end', function handleStreamEnd() {
                    var responseData = Buffer.concat(responseBuffer);
                    if (config.responseType !== 'arraybuffer') {
                        responseData = responseData.toString(config.responseEncoding);
                    }

                    response.data = responseData;
                    settle(resolve, reject, response);
                });
            }
        });

        // Handle errors
        req.on('error', function handleRequestError(err) {
            if (req.aborted) return;
            reject(enhanceError(err, config, null, req));
        });

        // Handle request timeout
        if (config.timeout) {
            timer = setTimeout(function handleRequestTimeout() {
                req.abort();
                reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED', req));
            }, config.timeout);
        }

        if (config.cancelToken) {
            // Handle cancellation
            config.cancelToken.promise.then(function onCanceled(cancel) {
                if (req.aborted) return;

                req.abort();
                reject(cancel);
            });
        }

        // Send the request
        if (utils.isStream(data)) {
            data.on('error', function handleStreamError(err) {
                reject(enhanceError(err, config, null, req));
            }).pipe(req);
        } else {
            req.end(data);
        }
    });
};