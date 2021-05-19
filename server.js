const express = require('express');
const app = express();
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const config = require('config');
const uuid = require('uuid');
const auth = require('./middleware/auth');
const cors = require('cors')

const PORT = process.env.PORT || 8000;

const findUser = (by) => {
    
    const jsonFilePath = __dirname + '/data/' + 'users.json';

    let jsonData;

    try {
        let data = fs.readFileSync(jsonFilePath);
        jsonData = JSON.parse(data);
    } catch (err) {
        console.error(err);
    }

    let users = jsonData.users

    let filteredUsers = users.filter((user) => {

        for (const key in by) {
            if (user[key] && user[key] === by[key])
                return user;
        }
    })

    if (!filteredUsers.length)
        return null

    return filteredUsers[0]
}

const findOrder = (userId) => {
    
    const jsonFilePath = __dirname + '/data/' + 'orders.json';

    let jsonData;

    try {
        let data = fs.readFileSync(jsonFilePath);
        jsonData = JSON.parse(data);
    } catch (err) {
        console.error(err);
    }

    let orders = jsonData.orders

    let filteredOrders= orders.filter((order) => order.userId === userId)

    return filteredOrders
}

const createUser = (user) => {

    const jsonFilePath = __dirname + '/data/' + 'users.json';

    let jsonData;

    try {
        let data = fs.readFileSync(jsonFilePath);
        jsonData = JSON.parse(data);
    } catch (err) {
        console.error(err);
    }

    let users = jsonData.users

    users.push(user)

    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData));
}

const createOrder = (order) => {

    const jsonFilePath = __dirname + '/data/' + 'orders.json';

    let jsonData;

    try {
        let data = fs.readFileSync(jsonFilePath);
        jsonData = JSON.parse(data);
    } catch (err) {
        console.error(err);
    }

    let orders = jsonData.orders

    orders.push(order)

    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData));
}

app.use(cors())
app.use('/', express.static(__dirname + '/public'))
app.use(express.json({ extended: false }))

app.post(
    '/api/order',
    [
        auth,
        check('email', 'Please include a valid email')
        .isEmail(),
        check('name', 'Name is required')
        .exists(),
        check('tel', 'Phone number is required')
        .exists(),
        check('address', 'Address is required')
        .exists()
    ],
    async (req, res) => {
    
        const errors = validationResult(req)
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        
        try {
    
            let order = {...req.body, userId: req.user.id, id: uuid.v4()}
            
            createOrder(order);

            res.json({success: true})

        } catch (error) {
            console.log(error.message)

            res.status(500).json({msg: 'Server Error'})
        }
})

app.post(
    '/api/login',
    [
        check('email', 'Please include a valid email')
        .isEmail(),
        check('password', 'Password is required')
        .exists()
    ],
    async (req, res) => {
    
        const errors = validationResult(req)
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        
        try {
            const { email, password } = req.body;
    
            let user = findUser({ email })
    
            if (!user) {
                return res.status(400).json({ msg: 'Invalid credentials' })
            }

            const isMatch = await bcrypt.compare(password, user.password)

            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid credentials' })
            }

            const payload = {
                user: {
                    id: user.id
                }
            }

            jwt.sign(payload,
                config.get('jwtSecret'), 
                {
                    expiresIn: 360000
                }, 
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                })

        } catch (error) {
            console.log(error.message)

            res.status(500).json({msg: 'Server Error'})
        }
})


app.post(
    '/api/register',
    [
        check('name', 'Please add name')
        .not().isEmpty(),
        check('email', 'Please include a valid email')
        .isEmail(),
        check('password', 'Please enter a password with 6 or more characters')
        .isLength({ min: 6 })
    ],
    async (req, res) => {
        
        const errors = validationResult(req)
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        
        try {
            const { name, email, password } = req.body;
    
            let user = findUser({ email })
    
            if (user) {
                return res.status(400).json({ msg: 'User already exists' })
            }

            user = {id: uuid.v4(), name, email, password}
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            createUser(user)

            const payload = {
                user: {
                    id: user.id
                }
            }

            jwt.sign(payload,
                config.get('jwtSecret'), 
                {
                    expiresIn: 360000
                }, 
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                })

        } catch (error) {
            console.log(error.message)

            res.status(500).json({msg: 'Server Error'})
        }
})

app.get('/api/data', function(req, res) {

    const jsonFilePath = __dirname + '/data/' + 'data.json';

    let jsonData;

    try {
        let data = fs.readFileSync(jsonFilePath);
        jsonData = JSON.parse(data);
    } catch (err) {
        console.error(err);

        res.status(500).json({msg: 'Server Error'})
    }

    res.json(jsonData);
});

app.get('/api/loaduser', auth, async function(req, res) {

    try {
        const user = findUser({id: req.user.id})
        if (!user)
            res.status(401).json({msg: "Nincs ilyen user"})
        else
            res.json(user)

    } catch (error) {
        console.log(error.message)
        res.status(500).json({msg: 'Server Error'})
    }
});

app.get('/api/orders', auth, async function(req, res) {

    try {
        const orders = findOrder(req.user.id)
        res.json(orders)

    } catch (error) {
        console.log(error.message)
        res.status(500).json({msg: 'Server Error'})
    }
});

app.get('*',function(req,res){
    res.sendFile(__dirname + "/public/index.html")
});



app.listen(PORT, function() {
    console.log('Express server listening on port ', PORT);
});