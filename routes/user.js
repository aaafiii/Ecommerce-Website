var express = require('express');
var router = express.Router();
const productHelpers= require('../helpers/product-helpers');
const userHelpers= require('../helpers/user-helpers');
const verifyLogin=(req,res,next)=>{
  if(req.session.loggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user=req.session.user
  console.log(user);
  let cartCount=null
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
  }

  productHelpers.getAllProducts().then((products)=>{
    res.render('user/get-products' ,{products,user,cartCount}); //cuz user is in server memory, so we can get it anywhere
  })  //cookie is in browser and session in server. they check if they both match
});

router.get('/login', (req,res)=>{
  if(req.session.loggedIn){
    res.redirect('/')
  }else{
  res.render('user/login',{"loginErr": req.session.loginErr})
  req.session.loginErr=false
  }

})

router.get('/signup', (req,res)=>{
  res.render('user/signup')
})

router.post('/signup', (req,res)=>{
  userHelpers.doSignup(req.body).then((response)=>{
    console.log(response);
    req.session.loggedIn=true
    req.session.user=response
    
    res.redirect('/')
  })

})

router.post('/login', (req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.loggedIn=true
      req.session.user=response.user  //the user data we got when we loggedin is taken as the session
      
      res.redirect('/')
    }else{
      req.session.loginErr="Invalid username or Password"
      res.redirect('/login')
    }
  })

})

router.get('/logout', (req,res)=>{
  req.session.destroy()
  res.redirect('/')
})

router.get('/cart',verifyLogin, async (req,res)=>{
  let products=await userHelpers.getCartProducts(req.session.user._id)
  let totalValue=0
  if(products.length>0){
    totalValue=await userHelpers.getTotalAmount(req.session.user._id)}
  let user=req.session.user._id
  console.log(user);
  res.render('user/cart',{products, user,totalValue})
})

router.get('/add-to-cart/:id', verifyLogin, (req,res)=>{
    console.log("api call");
    userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
      res.json({status:true})
   // res.redirect('/')
  })


})


router.post('/change-product-quantity/',(req,res,next)=>{
  console.log(req.body);
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{         //req.body means the data from first half of ajax
      response.total=await userHelpers.getTotalAmount(req.body.user)        //to update total when inc or dec
      res.json(response)  //cuz we are only passing javascript objects. so the server wont refresh
  })
})

router.get('/place-order',verifyLogin, async(req,res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order',async (req,res)=>{
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if(req.body['payment-method']==='COD'){
      res.json({codSuccess:true})
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })

    }

  })
  console.log(req.body);

})

router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})

router.get('/orders',async(req,res)=>{
  let orders=await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})

router.get('/view-order-products/:id',async(req,res)=>{
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})

router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log("Payment successfull");
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:''})
  })
})

router.get('/remove-product/:id',(req,res)=>{
  let prodId=req.params.id         //if we are sending id into the url, then we call params in post, we use req.body
  console.log(prodId);
  userHelpers.removeProduct(prodId).then((response)=>{
    res.redirect('/cart/')
  })

})
module.exports = router;
