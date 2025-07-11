const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

//get stock details
const getStock=async(req,res)=>{
   
    try{

        const stockData=await prisma.productStocks.findMany()
        const stockDetail=[]
    
        for(const stock of stockData){
            const obj={
                itemName:"",
                touch:0,
                weight:0,
                pure:0
            }
            const name=await prisma.item.findFirst({
                where:{
                    item_id:stock.item_id
                },
                select:{
                    item_name:true
                }
            })
            obj.itemName=name.item_name
    
            const value=await prisma.attributeValue.findFirst({
                where:{
                    items_id:stock.item_id,
                    process_step_id:27
                },
                select:{
                    touchValue:true,
                    value:true
                }
            })
            obj.touch=value.touchValue,
            obj.weight=value.value
            obj.pure=(value.touchValue*value.value)/100
            stock.itemDetail=obj
            stockDetail.push(stock)
    
        }
         
        res.send({data:stockDetail})
    }catch(err){
        res.send(500).json({err:'Stock is Empty'})
    }
   
}

module.exports = {
    getStock
  };