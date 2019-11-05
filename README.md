# learnAxiosCode

疯狂开坑，学习各种源码，哈哈。

这部分学习`axios`源码，因为它是个优秀的`http`库，谁用谁知道。

老规矩，先`npm`下一个`axios`包(我直接拷贝的), 打开依赖包`package.json`找到入口文件，开始起飞。

## 生命周期

所谓源码就是看以下`axios`整个生命周期，`axios`主要由三部分组成：

1. [拦截器](./拦截器管理员/README.md)
2. [取消Token](./取消器/README.md)
3. [适配器](./适配器/README.md)

三个部分担任了不同的功能，通过其他的包装就组成了`axios`

下面介绍了最初，是如何初始化一个`axios`的，[初始化一个axios](./初始化axios/README.md)