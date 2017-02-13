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

//20170213 ---end