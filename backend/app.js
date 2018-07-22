const express = require('express')
const app = express()
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const dcorejs = require('dcorejs')
const sha1 = require('sha1')
const fs=require('fs')  

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const config = {
    dcoreNetworkWSPaths: ['wss://hackathon2.decent.ch:8090'],
    chainId: '9c54faed15d4089d3546ac5eb0f1392434a970be15f1452ce1e7764f70f02936'
};

console.log("### Init...")
dcorejs.initialize(config)
console.log("### Read account database...")
account_db = JSON.parse(fs.readFileSync("./accounts.json"))  
console.log("### Read property database...")
prop_db = JSON.parse(fs.readFileSync("./properties.json"))  

console.log("### setup routes...")
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.get('/', (req, res) => {handle_index(req,res)})
app.get('/create', (req,res) => {handle_create_account(req,res)})
app.get('/byname/:name',(req,res)=>{handle_get_by_name(req,res)})

app.post('/contract/add', upload.array(), (req,res)=>{handle_add_contract(req,res)})
app.post('/contract/cancel', upload.array(), (req,res)=>{handle_cancel_contract(req,res)})

app.get('/data/property/:id?', (req, res) => {handle_get_prop_by_id(req, res)})

app.get('/property/:id?', (req, res) => {handle_get_prop_by_id_html(req, res)})
app.get('/areacode/:ac', (req, res) => {handle_get_by_area_code(req, res)})


app.get('/getmsgL/:name', (req,res) => {handle_get_landlord_contracts(req,res)})
app.get('/getmsgT/:name', (req,res) => {handle_get_tenant_contracts(req,res)})


console.log("### start server...")
app.listen(3000, () => console.log('...listening on port 3000'))

function handle_get_by_name(req,res){

    console.log("params:")
    console.log(req.params)
}

// GET /property/:id
const handle_get_prop_by_id = async (req, res) =>{
    if(!!req.params.id){
        r = await get_prop_by_id(req.params.id)
        res.json(r)
    } else {
        //fetch all
        res.json(prop_db);
    }
}

// GET /property/:id
const handle_get_prop_by_id_html = async (req, res) =>{
    if(!!req.params.id){
        r = await get_prop_by_id_html(req.params.id)
        res.send(r)
    } else {
        //fetch all
        res.json(prop_db);
    }
}

const handle_get_landlord_contracts = async (req, res) =>{
    res.json(await get_landlord_contracts(req.params.name));
}

// GET /areacode/:ac
function handle_get_by_area_code(req, res){
    r = get_props_by_area_code(req.params.ac)
    res.json(r)
}

// POST /contract/add
const handle_add_contract = async (req, res) => {
    console.warn("Adding contract")
    //console.log(req.body)
    if(!!req.body.l &&
       !!req.body.t &&
       !!req.body.price &&
       !!req.body.prop_id &&
       !!req.body.sublet){

       prop 
   
        register_contract(req.body.l, req.body.t,
                          [req.body.price, req.body.sublet,req.body.prop_id])
            res.json(['ok',{}])
       } else {
            console.error("Must provide l and q")
            res.json(['error',{description:'Must provide l and q'}]) 
       }
}

// POST /contract/cancel
function handle_cancel_contract(req, res){
    console.warn("Canceling contract")
    //console.log(req.body)
    if(!!req.body.l && !!req.body.t){
        cancel_contract(req.body.l,req.body.t)
        res.json(['ok',{}])
    } else {
        console.error("Must provide l and q")
        res.json(['error',{description:'Must provide l and q'}])
    }
}

function handle_get_tenant_contracts(req, res){
    res.json(get_tenant_contracts(req.params.name));
}

// private API
const get_landlord_contracts = async (name) => {
    console.log("lookup landlord contracts")
    var pk = lookup_pk(name); 
    if(pk==""){
        return -1;
    }
    dcorejs.account().getAccountByName(name)
        .then(result => {
            //success
            console.log("list contracts for landlord " + name)
            dcorejs.messaging().getSentMessages(result.id, pk)
                .then(msg => {
                    msg.forEach(item => {
                        console.log("from:" + item.sender)
                        console.log(item.receivers_data);
                        console.log(item.text)
                    });
                })
        })
        .catch(err =>{
            console.error(err);
        })

    console.log("async...")
    var account = await dcorejs.account().getAccountByName(name);
    //console.log(account);
    var msgs = await dcorejs.messaging().getSentMessages(account.id, pk)
    return msgs;    
}

function get_tenant_contracts(name){
   var pk = lookup_pk(name); 
    if(pk==""){
        return -1;
    }
   //pk_sender="5K7cpdd3ShccurdjQecH8zSRkncT81hUz33MdNV2spYufqGoFTg";
    dcorejs.account().getAccountByName(name)
        .then(result => {
            //success
            console.log("list contracts for tenant " + name)
            dcorejs.messaging().getSentMessages(result.id, pk)
                .then(msg => {
                    msg.forEach(item => {
                        console.log("from:" + item.sender)
                       /* dcorejs.account().getAccountById(item.sender)
                            .then(result_=>{
                                var sender_name = result_.name;
                                var pk_sender = lookup_pk(sender_name);
                                dcorejs.messaging().getMessages(result.id, pk_sender)
                                    .then(decryptedmsg =>{

                                    })        
                            })})*/
                        console.log(item.receivers_data);
                        //var plainmsg = dcorejs.CryptoUtils.decrypt(item.receivers_data[0].data,pk_sender)
                        console.log(item.text)
                    });
                    return msg; 
                })
        })
        .catch(err =>{
            console.error(err);
            return -1;
        })
}


const get_prop_by_id = async (id_) => {
    var props = prop_db.filter((item)=>(item.id == id_));
    if(props.length!=1){
        return ["not found"]
    } 
    var prop = props[0];
    var prop_contracts = await get_landlord_contracts(prop.owner);
    console.log("----------------------")
    if(prop_contracts.length == 0){
        prop.status = 'free'
    } else {
        last_contract = prop_contracts[prop_contracts.length - 1];
        last_contract_msg = JSON.parse(last_contract.text); 
        if (last_contract_msg.action == 'CANCEL'){
            prop.status = 'free'
            prop.prev_price = JSON.parse(prop_contracts[prop_contracts.length - 2].text).price;
        } else {
            prop.status = 'rented'
            prop.agreement = {
                sublet_allowed: last_contract_msg.sublet_allowed,
                sublet: last_contract_msg.sublet,
                price: last_contract_msg.price
            }
            
        }
    }    
    return prop;
}

const get_prop_by_id_html = async (id_) => {
    var props = prop_db.filter((item)=>(item.id == id_));
    if(props.length!=1){
        return ["not found"]
    } 
    var prop = props[0];
    var prop_contracts = await get_landlord_contracts(prop.owner);
    console.log("----------------------")
    if(prop_contracts.length == 0){
        prop.status = 'free'
    } else {
        last_contract = prop_contracts[prop_contracts.length - 1];
        last_contract_msg = JSON.parse(last_contract.text); 
        if (last_contract_msg.action == 'CANCEL'){
            prop.status = 'free'
            prop.prev_price = JSON.parse(prop_contracts[prop_contracts.length - 2].text).price;
        } else {
            prop.status = 'rented'
            prop.agreement = {
                sublet_allowed: last_contract_msg.sublet_allowed,
                sublet: last_contract_msg.sublet,
                price: last_contract_msg.price
            }
            
        }
    }    
    var acc = "<html><body><table>";
    
    acc += "<tr><td> Address:</td><td>" + prop.address + "<td></tr>";
    acc += "<tr><td> Landlord-ID:</td><td>" + prop.owner + "<td></tr>";
    acc += "<tr><td> Status:</td><td>" + prop.status + "<td></tr>";
    acc += "</table>";
    if(prop.status=="free"){
        acc += "<a href='/newcontract'> Register new rent contract</a>";
    } else {
        acc += "<a href='/newsubcontract'> Register new sub-rent contract</a>";
        acc += "<a href='/cancelcontract'> Cancel contract</a>";
    }
    acc += "</body></html>";
    return acc;
}

function get_props_by_area_code(ac_){
    var r = prop_db.filter((item)=>(item.area_code == ac_));
    return r; 
}

function lookup_pk(name_){
    var r = account_db.filter((item)=>(item.name == name_)); 
    if(r.length>0)
        return r[0].wif_priv_key;
    else
        return "";
}

//todo

// check_status
//


/*
http://localhost:3000/addcontract?l=fair-38a2645bca5f7c2b2bfddb7a4d5f8663d1723ae3&t=fair-a952ffc0791dc63d21b0b0b5946f0e063bfa304b&price=700&sublet=1
*/
function register_contract(landlord_name, tenant_name, contract_data){
    console.log("### Adding new contract:");
    console.log("   Landlord: " + landlord_name)
    console.log("   Tenant: " + tenant_name)
    console.log(" Contract data:")
    console.log("   Property:" + contract_data[2])
    console.log(" Description:")
    console.log(get_prop_by_id(contract_data[2]))
    console.log("   Price:" + contract_data[0])
    console.log("   Sublet allowed:" + contract_data[1])
    
    var landlord_id, tenant_id;
    //console.log("### Query id's");
    // <method=CREATE|CANCEL> <0=main|1=sub> <price> <0=sub_not_allowed|1=sub_allowed>
    var msg = 
        {action:'CREATE',
         sublet:0,
         tenant:0,
         price:contract_data[0],
         sublet_allowed:contract_data[1],
         prop_id:contract_data[2]};
    console.log("message: " + msg)
    pk = lookup_pk(landlord_name);
    tpk = lookup_pk(tenant_name);
    Promise.all([dcorejs.account().getAccountByName(landlord_name),dcorejs.account().getAccountByName(tenant_name)])
        .then(res => {
            console.log("Landlord ID is:" + res[0].id);
            console.log("Tenant ID is:" + res[1].id);
            
            console.log("### Now broadcast to the blockschain...")
            dcorejs.messaging().sendMessage(res[0].id,res[1].id,JSON.stringify(msg),pk)
                .then(result=>{
                    console.log("### OK O->T")
                    console.log(result);
                    return 0;
                })
                .catch(err => {
                    console.log("### Error sending message");
                    return -1;
                })
            msg.tenant = 1;
            dcorejs.messaging().sendMessage(res[1].id,res[0].id,JSON.stringify(msg),tpk)
                .then(result=>{
                    console.log("### OK T->O")
                    console.log(result);
                    return 0;
                })
                .catch(err => {
                    console.log("### Error sending message");
                    return -1;
                })    

        })
        .catch(err => {
            console.log("### Error\n");
            console.log(err);
        })
}


function cancel_contract(landlord_name, tenant_name){
    console.log("### Canceling contract:");
    console.log("   Landlord: " + landlord_name)
    console.log("   Tenant: " + tenant_name)
   
    var landlord_id, tenant_id;
    var msg = JSON.stringify(
        {action:'CANCEL',
         reason:'...'});
  
    pk = lookup_pk(landlord_name);
    tpk = lookup_pk(tenant_name);
    Promise.all([dcorejs.account().getAccountByName(landlord_name),dcorejs.account().getAccountByName(tenant_name)])
        .then(res => {
            console.log("Landlord ID is:" + res[0].id);
            console.log("Tenant ID is:" + res[1].id);
            
            console.log("### Now sending the message...")
            dcorejs.messaging().sendMessage(res[0].id,res[1].id,msg,pk)
                .then(result=>{
                    console.log("### OK O->T")
                    console.log(result);
                    return 0;
                })
                .catch(err => {
                    console.log("### Error sending message");
                    return -1;
                })

            dcorejs.messaging().sendMessage(res[1].id,res[0].id,msg,tpk)
                .then(result=>{
                    console.log("### OK T->O")
                    console.log(result);
                    return 0;
                })
                .catch(err => {
                    console.log("### Error sending message");
                    return -1;
                })    
        })
        .catch(err => {
            console.log("### Error\n");
            console.log(err);
        })
}


function handle_index(req,res){
    var acc = "";
    acc += "Hello\n";
    res.send(acc);
    // blockchain code
}   


function handle_create_account(req,res){
    const brainKey = dcorejs.Utils.suggestBrainKey();
    const credentials = dcorejs.Utils.getBrainKeyInfo(brainKey);
    const my_account_name = "fair-" + sha1("fair" + Date.now());
    console.log(my_account_name);
    credentials.name = my_account_name;
    console.log(credentials);
    // owner key is generated with sequenceNumber = 0
    //const ownerKey = dcorejs.Utils.generateKeys(brainKey)[0];
    //const activeKey = dcorejs.Utils.derivePrivateKey(brainKey, sequenceNumber + 1);
    //const memoKey = dcorejs.Utils.derivePrivateKey(brainKey, sequenceNumber + 2);
    const registrar = '1.2.105'; //hackathon-berlin-3
    const registrar_pkey = '5KfhzvrjJqN7R1tf2j5qWKmegDawac6Z4s4pZFBZniCggJmUh81';
   
    dcorejs.account().createAccountWithBrainkey(brainKey,my_account_name,registrar,registrar_pkey)
        .then(result => {
           console.log("### register account: Success\n");
           console.log(result);
           res.send("Success")
        })
        .catch(err => {
           console.log("### register account: Error\n");
           console.log(err);
           res.send("Error")
        });
}