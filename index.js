const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.b4uwa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const jobCollections = client.db("jobsDB").collection("jobs");
    const bidCollections = client.db("jobsDB").collection("bids");
    app.post("/job", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollections.insertOne(newJob);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const jobs = await jobCollections.find().toArray();
      res.send(jobs);
    });
    
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollections.findOne(query);
      res.send(result);
    });

    // Bid
    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      // one user can bit once in a job
      const query = {
        applicant_email: newBid.applicant_email,
        job_id: newBid.job_id,
      };
      const alreadyExits = await bidCollections.findOne(query);
      if (alreadyExits)
        return res.status(400).send("You already bided this job");

      // Save data in bids collections
      const result = await bidCollections.insertOne(newBid);
      // Increment bid count when place a bid
      const filter = { _id: new ObjectId(newBid.job_id) };
      const update = {
        $inc: {
          bids_count: 1,
        },
      };
      const updateBidCount = await jobCollections.updateOne(filter, update);

      res.send(result);
    });

    // Bids found individually by user email
    app.get("/my-bids/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        applicant_email: email,
      };
      const result = await bidCollections.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
