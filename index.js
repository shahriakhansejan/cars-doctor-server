const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://cars-doctor-9cc77.web.app',
    'https://cars-doctor-9cc77.firebaseapp.com'
  ],
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ocam1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// Custom middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  } else {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      console.log({ decoded });

      if (err) {
        return res.send({ message: "unauthorized access" });
      } else {
        req.user = decoded;
        next();
      }
    });
  }
};

const cookeOption = {
  httpOnly: true,
  secure: true,
  sameSite: "None"
}

//  *****For Localhost
// const cookeOption = {
//   httpOnly: true,
//   secure: false,
//   sameSite: "strict"
// }

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    
    const servicesCollection = client.db('carsDoctor').collection('services');
    const bookingsCollection = client.db('carsDoctor').collection('bookings');

    // Auth Related section
    app.post('/jwt', async(req,res)=>{
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      
      
      res.cookie("token", token, cookeOption ).send({ success: true });
    })
    

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logout", user);
      res.clearCookie("token", { ...cookeOption, maxAge: 0 }).send({ success: true });
    });

    // service-section
    app.get('/services', async(req,res)=>{
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/services/:id', async(req,res) =>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id)}
      const option = {
        projection: { title: 1, price: 1, img: 1}
      }
      const result = await servicesCollection.findOne(query, option);
      res.send(result)
    })

    app.post('/bookings', async(req,res)=>{
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result)
    })

    app.get("/bookings", verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("token owner", req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/bookings/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await bookingsCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/bookings/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)}
      const updateBooking = req.body;
      const updateDoc ={
        $set:{
          status: updateBooking.status
        }
      }
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })







    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
    res.send('Cars-Doctor server is running')
})
app.listen(port, ()=>{
    console.log(`Cars-doctor server is running on port ${port}`)
})