const express=require('express');
const jwt=require('jsonwebtoken');
const {authenticateJwt,jwtPass}=require('../middleware/authentication');
const {user,admin,course}=require('../DB/db');
const Razorpay=require('razorpay');
require('dotenv').config();
const crypto=require('crypto')

const router=express.Router();


// User routes

router.post('/signup',async (req, res) => {
    // logic to sign up user
  
    //taking input from body to create user account
    const {username,password}=req.body;
    
  
    //check if user already exists
    const existing_user=await user.findOne({username});
   
    if(existing_user)
      res.json({message:'user already exist'})
  
    else
    {
      const obj={username,password}
  
      const newUser=new user(obj);
      newUser.save().then(()=>
        {
          //assigning jwt token
          const token=jwt.sign({username,role:'user'},jwtPass)
          res.json({message:'user account created',token:token})
        })
    } 
  });
  
  
  
  router.post('/login',async (req, res) => {
    // logic to log in user
  
    const { username, password} = req.headers;
    //authenticate user
    const get_user=await user.findOne({username,password});
  
    if(get_user)
    {
      //generating token
      const token=jwt.sign({username,role:'user'},jwtPass)
      res.send({message:'logged in succesfully',token:token})
    }
    else
    res.send({message:"invalid login credentials"});
  });
  
  //route for getting email if logged in
  router.get('/me',authenticateJwt,(req,res)=>{
      let username=req.user.username;
      res.json({username});
  })
  
  
  router.get('/courses',authenticateJwt,async (req, res) => {
    // logic to list all courses
     const all_courses=await course.find({});
     if(all_courses.length==0)
      res.json({message:'no courses available'});
  
     else
     res.json({all_courses});   
  });
  
  //get course by given id
  router.get('/course/:courseId',authenticateJwt,(req,res)=>{
  
    let input_courseId=req.params.courseId;
    course.findById(input_courseId).then((result)=>{
      res.json({course:result});
    })
  })

 
  


  router.get('/purchasedCourses',authenticateJwt,async(req, res) => {
     // logic to view purchased courses
     
   //getting user purchased courses
   const user_detail=await user.findOne({username:req.user.username});
  
   if(user_detail)
   {
      const purchased=user_detail.purchased_courses;
      if(purchased.length==0)
       res.send({message:'no purchased courses'});
     
      else 
      {
        let purchasedCourses=[];

        if(purchased.length==0)
          res.json({message:'no course purchased'});

        else{
          //async await important here. Think why?

          // The forEach method doesn't handle asynchronous operations properly because it doesn't wait for the promises returned by async functions to resolve so use for..of loop

          //on using forEach 1.prints output but 2.prints empty array

          for(let id of purchased){
            let c=await course.findById(id.toString());
            purchasedCourses.push(c);
            // console.log("1."+purchasedCourses);
          }
          // console.log("2."+purchasedCourses);
          res.json({purchased:purchasedCourses});  
        }
        }      
   }
   else
   {
      res.status(403).send('user not found');
   }
    
  });


  //payment gateway integration

//creating order
router.post('/order',async(req,res)=>{
  //initialising razorpay instance
  const razorpay=new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_SECRET
  });
  //setting options
  const options={
    amount:req.body.amount*100,
    currency:'INR',
    receipt:`receipt_${new Date().getTime()}`,
  };
  try{
    const response=await razorpay.orders.create(options)
    res.json(response)
  }catch(err){
    res.status(400).json({message:'order not created!',error:err})
  }
})

// for verfiying payment
router.post('/verifyPayment',async(req,res)=>{
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const keySecret = process.env.RAZORPAY_SECRET; // Replace with your Key Secret
  const body = razorpay_order_id + "|" + razorpay_payment_id; //razorpay convention

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    res.status(200).json({ message: 'Payment verified successfully!',verified:true });
  } else {
    res.status(400).json({ error: 'Invalid payment signature!',verfied:false });
  }
})

 //purchase course-->will be called once payment verified
 router.post('/courses/:courseId',authenticateJwt, async(req, res) => {
    
  const input_courseId=req.params.courseId;
  // Getting course
  const course_to_be_purchased = await course.findById(input_courseId);

  if (!course_to_be_purchased) {
    return res.status(404).json({message:'Course not found'});
  }
  
  //else
  const user_detail = await user.findOne({ username: req.user.username });  //got username by jwt

  if (!user_detail) {
    return res.status(404).json({message:'User not found'});
  }
  
  console.log(user_detail);

//TODO: avoid purchase of course if already purchased
  // if(user_detail.purchased_courses.some(ele=>ele===input_courseId))
  //   return res.send('course already purchased');

  user_detail.purchased_courses.push(course_to_be_purchased);
  await user_detail.save();
  res.json({message:'course purchased succesfully'});
});


  module.exports=router