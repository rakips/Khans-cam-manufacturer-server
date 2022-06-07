const express = require('express')
const cors = require('cors');
// JWT 
const jwt = require('jsonwebtoken');
// dotenv config
require('dotenv').config();
//mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.of0kn.mongodb.net/?retryWrites=true&w=majority`;

//Client
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// for jwt verifications 
function verifyJWT(req, res, next) {
    // 1: read authHeader
    const authHeader = req.headers.authorization;
    // 2
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    //2.1: jodi token thake (get token)
    const token = authHeader.split(' ')[1];
    // 3: verify
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        //4:next
        next();
        // console.log(decoded); 
    });
    // console.log('abc');
}


async function run() {
    try {
        await client.connect();
        //products collections
        const productCollection = client.db('pixel_camera').collection('products');
        //products collections
        const reviewCollection = client.db('pixel_camera').collection('reviews');
        //user collections
        const usersCollection = client.db('pixel_camera').collection('users');
        //user collections
        const orderCollection = client.db('pixel_camera').collection('orders');


        // verify admin section
        // for admin verify
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.send(403).send({ message: 'forbidden' });
            }
        }

        //get all products
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();

            res.send(products)
        })

        // get single product 
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })


        //add product from client
        app.post('/product', async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result);
        })

        //for admin check
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });

        })

        //product delete for admin
        // app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
        app.delete('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        // users Roll make admin  and jwt*********
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;

            // if (requesterAccount.role === 'admin') {
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            //send data
            res.send(result)
        })

        //order section---------------------
        app.put('/order', async (req, res) => {
            const newProduct = req.body;
            const result = await orderCollection.insertOne(newProduct);
            res.send(result);
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const product = req.query.product;

            //for jwt verification after verifyJWT
            const decodedEmail = req.decoded.email;
            if (product === decodedEmail) {
                // console.log('auth header', authorization)
                // const query = { _id: ObjectId(id) };
                const query = { bEmail: product };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users)
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            // user: thakle update, na thakle create
            const options = { upsert: true };

            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            // for JWT create
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
            //send data
            res.send({ result, token })
        })


        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const products = await cursor.toArray();

            res.send(products)
        })





    }
    finally {

    }


}

run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('welcome To Pixel Camera Manufacture')
})

app.listen(port, () => {
    console.log(`Pixel listening on port ${port}`)
})