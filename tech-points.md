//20170213 ---start
# +new Date() 
```
new Date()// Date对象
+new Date() //会转化为时间戳数字
```
# ajax添加header
直接在options中设置：
```
$.ajax({
    headers:{
        arg1:'val1'
    }
})
```
# 事件处理
## 添加事件
通过原生函数 addEventListener  
事件代理：通过event.target来查找父节点中是否有被代理元素来判断  

## 删除事件
通过原生函数 removeEventListener  

## 触发事件
通过原生函数 dispatchEvent  

//20170214

# 获取样式属性值
使用原生 getComputedStyle 和 getPropertyValue
```
//第一个参数是dom对象
//第二个参数为伪类，如果没有伪类，就传入null
window.getComputedStyle(element, null).getPropertyValue("float");//获取float值
//getComputedStyle参数传入有误时，会抛出异常。zepto中做了一次包装，处理了异常情况
```

# (1,eval)('this')
参考地址：http://www.cnblogs.com/qianlegeqian/p/3950044.html  

严格模式下，匿名函数中的this为undefined  
```
'use strict';
(function(){
    console.log((1,eval)('this'));
})()
=> window
```
```
'use strict';
(function(){
    console.log(eval('this'));
})()
=> undefined
```



