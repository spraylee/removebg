# 自动化抠图接口

## 请求端点

> POST 方式

```
http://removebg.spraylee.com/removebg
```

## 请求参数

> json 格式, 其中 proxy 可以不填

```
{ "url": "https://himg2.huanqiucdn.cn/attachment2010/2019/1203/20191203080329185.jpg", "proxy": "123.123.123.123:123" }
```

## 返回参数

> 正常情况下，10 多秒返回抠图结果

```
{
  "result": "https://o.remove.bg/downloads/d9d096e8-24c0-4fe0-8e1d-ae3ae00283ff/20191203080329185-removebg-preview.png",
  "time": {
    "openBrowser": 123,
    "openPage": 123,
    "openSite": 123,
    "inputImageUrl": 123,
    "getResult": 123,
    "total": 123,
  }
}
```

## 异常处理

未提供 url 参数时，400 错误；抠图失败时，500 错误，提供以下的错误原因，抠图失败或超时时，一般约 30 多秒后返回错误原因

```
{ "reason": "some reason..."}
```

## 注意事项

ubuntu 上若安装 puppeteer 失败，可以尝试 npm install -g puppeteer --unsafe-perm=true --allow-root，参考 https://github.com/puppeteer/puppeteer/issues/2173
