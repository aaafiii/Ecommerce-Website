var express = require('express');
var router = express.Router();
var productHelpers= require('../helpers/product-helpers');

/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelpers.getAllProducts().then((products)=>{
    res.render('admin/get-products' ,{admin:true, products});
  })
 
});

router.get('/add-product', function(req,res) {
  res.render('admin/add-product')
})
router.post('/add-product', (req,res)=>{

  productHelpers.addProduct(req.body,(insertedId)=>{
    let Image=req.files.Image;
    console.log(insertedId);
    Image.mv('./public/product-images/'+insertedId+'.jpg',(err)=>{
      if(!err){
        res.render('admin/add-product');
      }else{
        console.log(err);
      }

    })
 
  })

})

router.get('/delete-product/:id',(req,res)=>{
  let prodId=req.params.id         //if we are sending id into the url, then we call params in post, we use req.body
  console.log(prodId);
  productHelpers.deleteProduct(prodId).then((response)=>{
    res.redirect('/admin/')
  })

})

router.get('/edit-product/:id',async (req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id);
  console.log(product);
  res.render('admin/edit-product', {product})
})

router.post('/edit-product/:id', (req,res)=>{
  let id=req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let Image=req.files.Image;
      Image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})


module.exports = router;
