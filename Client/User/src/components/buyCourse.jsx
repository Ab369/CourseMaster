import { useState ,useEffect} from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// const server='http://localhost:3000'
const server='https://coursemaster-c156.onrender.com';


function BuyCourse()
{
   let {courseId}=useParams();
   const[course,setCourse]=useState({});

   useEffect(()=>{
      fetch(server+'/user/course/'+courseId,{
         method:'GET',
         headers:{
            'Authorization':'Bearer '+localStorage.getItem('token')
         }
      }).then((res)=>{
         res.json().then((data)=>{
            setCourse(data.course)
         })
      })
   
   },[])
   
   return(
    <div className="mx-5">
      <Coursecomp course={course}></Coursecomp>
    </div>
   )
}

//display course and buy options
function Coursecomp(props)
{
   const navigate=useNavigate();
   const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);

  // Load Razorpay script dynamically
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve, reject) => {
        if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
          setIsRazorpayLoaded(true);
          resolve(true);
        } else {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => {
            setIsRazorpayLoaded(true);
            resolve(true);
          };
          script.onerror = () => reject(false);
          document.body.appendChild(script);
        }
      });
    };

    loadRazorpayScript().catch(() => {
      alert('Failed to load Razorpay. Please refresh the page.');
    });
  }, []);

  const makePayment = async () => {
    if (!isRazorpayLoaded) {
      alert('Razorpay is not loaded yet. Please try again later.');
      return;
    }

    try {
      // Step 1: Create Order on the server
      const orderResponse = await fetch(server+'/user/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(props.course.price), currency: 'INR' }),
      });
      const order = await orderResponse.json();

      // Step 2: Initialize Razorpay Options
      const options = {
        key: "rzp_test_2LnXStGVLcIKe7", // Replace with your Razorpay Key ID
        amount: order.amount,
        currency: order.currency,
        name: 'CourseMaster',
        description: 'Test Transaction',
        order_id: order.id,
        
        //handler is called when user completes payment on checkout page
        handler: async function (response) {
          // Step 3: Verify Payment on the server
          const verifyResponse = await fetch(server+'/user/verifyPayment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          const verifyResult = await verifyResponse.json();
         //  alert(verifyResult.message);
          // alert(verifyResult.verified);


          if(verifyResult.verified) //call save to db route
          {
            fetch(server+'/user/courses/'+props.course._id,{
               method:'POST',
               headers:{
                  'Authorization':'Bearer '+localStorage.getItem('token')
               }
            }).then(()=>{
               alert('course Purchased!')
               navigate('/courses/purchased')
            }).catch((err)=>alert(err))
         }


        },
        
        prefill: {
          name: 'Enter Card No.- 4718 6091 0820 4366',
          email: 'test@example.com',
          contact: '000000000000',
        },
      };

      // Step 4: Open Razorpay Checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Error in payment process:', error);
      alert('Something went wrong. Please try again.');
    }
   }

  return(
   <Card style={{maxWidth:800,minWidth:300,margin:'auto',marginTop:100}}>
   <CardMedia
     sx={{ height: 300 }}
     image={props.course.imageLink}
   />
   <CardContent>
     <Typography gutterBottom variant="h5" component="div">
       {props.course.title}
     </Typography>
     <Typography variant="body2" sx={{ color: 'text.secondary' }}>
     {props.course.description}
     </Typography>
   </CardContent>
   <CardActions>
   <Button className="hover:scale-105" variant="contained" color="success" style={{width:400,margin:'auto'}} onClick={makePayment} disabled={!isRazorpayLoaded}>
  BUY-{props.course.price}
  </Button>
   </CardActions>
 </Card>
  )
}

export default BuyCourse;