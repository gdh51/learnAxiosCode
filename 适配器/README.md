# adapters——适配器

适配器用于在合适的环境选择合适的发送请求的载体，优先采用`NodeJs`的`http`模块，它通过[初始化默认配置](../默认配置)或用户指定来进行选择：

- [http模块](./服务器适配器)
- [XHR对象](./浏览器适配器)