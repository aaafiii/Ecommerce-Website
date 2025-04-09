var db= require('../configuration/connection')
var collection=require('../configuration/collections')
const bcrypt=require('bcrypt')
const { ObjectId } = require('mongodb');
const Razorpay = require('razorpay');
var instance = new Razorpay({
    key_id: 'rzp_test_2NjBl1Gpk2Ir3N',
    key_secret: '7My4qPkC6JC9B66Zp1FETunM',
  });     


module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password=await bcrypt.hash(userData.Password,10)
            const result=await db.get().collection(collection.USER_COLLECTION).insertOne(userData);
            const insertedUser = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: result.insertedId });
                resolve(insertedUser)
            })
    },
    doLogin:(userData)=>{
        return new Promise(async (resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log("Login success");
                        response.user=user
                        response.status=true
                        resolve(response)
                    }
                    else{
                        console.log('Login failed');
                        resolve({status:false})
                    }

                })
            }else{
                console.log('Login failed');
                resolve({status:false})
            }
        })
    },
    addToCart:(prodId,userId)=>{
        let proObj={
            item:new ObjectId(prodId),
            quantity:1
        }
        return new Promise(async (resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==prodId)
                console.log(proExist);
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:new ObjectId(userId),'products.item':new ObjectId(prodId)},{  //to match the prodid from the products array
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
               db.get().collection(collection.CART_COLLECTION)
                 .updateOne({user:new ObjectId(userId)},
            {
                    $push:{products:proObj}
                
            }).then((response)=>{
                resolve()
            })
        }

            }else{
                let cartObj={
                    user:new ObjectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([     //aggregate vvv imp
                {
                    $match:{user:new ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
        
            ]).toArray()
            
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
            if (cart){
                count=cart.products.length
            }
            resolve(count)
        })

    },
    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)    //its aldready converted but still once more

        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:new ObjectId(details.cart)},              
                    {  
                        $pull:{products:{item:new ObjectId(details.product)}}
                    }
                    ).then((response)=>{
                        resolve({removeProduct:true})
                    })

                }else{
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:new ObjectId(details.cart), 'products.item':new ObjectId(details.product)},    //to match the productid from the products array
                {
                    $inc:{'products.$.quantity':details.count}
                }
                ).then((response)=>{
                    resolve({status:true})
                })
                }

        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([     //aggregate vvv imp
                {
                    $match:{user:new ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:[{$toDouble:'$quantity'},{$toDouble:'$product.Price'}]}}
                    }
                }
        
            ]).toArray()
            console.log(total[0].total);
            resolve(total[0].total)
        })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(order,products,total);
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:new ObjectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:new ObjectId(order.userId)})
                resolve(response.insertedId)
            })

        })

    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
            resolve(cart.products)
        })

    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userId);
            let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:new ObjectId(userId)}).toArray()
            console.log(orders);
            resolve(orders)
        })
    },

    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([     //aggregate vvv imp
                {
                    $match:{_id:new ObjectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
        
            ]).toArray()
            console.log(orderItems)
            resolve(orderItems)
        })
        
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options={
                amount: total*100,
                currency: "INR",
                receipt: ""+orderId,
                };
            instance.orders.create(options, function(err,order){
                if(err){
                    console.log(err);
                }else{
                    console.log("New Order:",order);
                    resolve(order)
                }
                });
            
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto=require('crypto');
            let hmac=crypto.createHmac('sha256','7My4qPkC6JC9B66Zp1FETunM')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:new ObjectId(orderId)},
        {
            $set:{
                status:'placed'
            }
        }
    ).then(()=>{
        resolve()
    })
        })
    },
    removeProduct:(prodId,userId)=>{
        return new Promise((resolve,reject)=>{
            console.log(prodId);
            console.log(new ObjectId(prodId));
            db.get().collection(collection.CART_COLLECTION).deleteOne({_id:new ObjectId(prodId)}).then((response)=>{
                resolve(response)
            })
        })
    }
}