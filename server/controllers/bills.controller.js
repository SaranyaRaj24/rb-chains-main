const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const saveBill = async (req, res) => {
  const {
    customer_id,
    totalPrice,
    order_status,
    oldBalance,
    orderItems,
    balance,
    closingbalance
  } = req.body;

  console.log('closingBlance', closingbalance)
  try {
    // Save master order
    const newOrder = await prisma.masterOrder.create({
      data: {
        customer_id: customer_id,
        order_status: order_status,
        total_price: parseFloat(totalPrice),
        oldBalance :parseFloat(oldBalance) 
      }
    });

    // Validate and save orderItems
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    for (const data of orderItems) {
      const newOrderItem = await prisma.orderItem.create({
        data: {
          order_id: newOrder.id,
          itemName: data.productName,
          touchValue: parseFloat(data.productTouch),
          productWeight: parseFloat(data.productWeight),
          final_price: parseFloat(data.productPure),
          stock_id: data.stockId
        }
      });

      await prisma.productStocks.update({
        where: { id: newOrderItem.stock_id },
        data: { product_status: 'sold' }
      });
    }

    // Validate and save balances
    if (balance.length >= 1) {
      // return res.status(400).json({ error: 'Balance is required' });

      for (const balanceData of balance) {
        await prisma.balance.create({
          data: {
            order_id: newOrder.id,
            customer_id: customer_id,
            gold_weight: parseFloat(balanceData.givenGold),
            gold_touch: parseFloat(balanceData.touch),
            gold_pure: parseFloat(balanceData.pure),
            remaining_gold_balance: parseFloat(closingbalance)
          }
        });
      }

      const existingCustomer = await prisma.closingBalance.findFirst({
        where: { customer_id: customer_id }
      });
      if (!existingCustomer) {

        await prisma.closingBalance.create({
          data: {
            customer_id: customer_id,
            closing_balance: parseFloat(closingbalance)
          }
        })

      }
      else {
        
        await prisma.closingBalance.update({
          where: { customer_id: customer_id },
          data: { closing_balance:parseFloat(closingbalance) }
        });
      }


      // await prisma.closingBalance.create({
      //   data: {
      //     customer_id: customer_id,
      //     closing_balance: parseFloat(closingbalance)
      //   }
      // })
    }
    else {
      const existingCustomer = await prisma.closingBalance.findFirst({
        where: { customer_id: customer_id }
      });
      if (!existingCustomer) {

        await prisma.closingBalance.create({
          data: {
            customer_id: customer_id,
            closing_balance: parseFloat(closingbalance)
          }
        })

      } else {
        console.log('update')
        
        await prisma.closingBalance.update({
          where: { customer_id: customer_id },
          data: { closing_balance:parseFloat(closingbalance) }
        });
      }




    }





    // Handle closing balance
    // const existingCustomer = await prisma.closingBalance.findFirst({
    //   where: { customer_id: customer_id }
    // });

    // if (!existingCustomer) {
    // Create new closing balance

    // } 
    // else {
    //   // Update closing balance by adding new value
    //   const updatedValue = parseFloat(existingCustomer.closing_balance) + parseFloat(closingbalance);
    //   await prisma.closingBalance.update({
    //     where: { customer_id: customer_id },
    //     data: { closing_balance : updatedValue }
    //   });
    // }

    res.status(201).json({ message: "Bill, items, balances, and closing balance saved!", data: newOrder });
  } catch (error) {
    console.error("Error saving bill:", error);
    res.status(500).json({ error: "Error saving bill" });
  }
};


//getBill

const getBill = async (req, res) => {
  const getBillData = await prisma.masterOrder.findMany({
    where: {
      id: parseInt(req.params.masterid)
    },
    select: {
      total_price: true,
      oldBalance:true,
      OrderItems: true,
      Balance: true,
      CustomerInfo: true


    }
  })
  res.send(getBillData)
}

const getCustomerBillWithDate = async (req, res) => {
  try {
    let { fromDate, toDate, customer_id } = req.query;
    console.log(req.query)
    let previousBill = ""
    let openingBalance = 0, closingBalance = 0;
    const now = new Date();


    if (!fromDate || !toDate) {
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      const endOfToday = new Date(now.setHours(23, 59, 59, 999));
      fromDate = startOfToday;
      toDate = endOfToday;
    } else {
      fromDate = new Date(fromDate);
      toDate = new Date(toDate);
      toDate.setHours(23, 59, 59, 999); // Ensure full-day inclusion
    }

    const filters = {
      created_at: {
        gte: fromDate,
        lte: toDate,
      }
    };





    if (customer_id && customer_id !== 'null') {
      filters.customer_id = Number(customer_id);
      //closing balance for customer
      closingBalance = await prisma.closingBalance.findFirst({
        where: {
          customer_id: Number(customer_id)
        },
        select: {
          closing_balance: true
        }
      })
      //opening balance for customer
      previousBill = await prisma.masterOrder.findMany({
        where: {
          created_at: {
            lt: new Date(fromDate)
          },
          customer_id: Number(customer_id)
        },
        include: {
          Balance: true,
        },
      });
      for (const openBal of previousBill) {
        if (openBal.Balance.length >= 1) {
          openingBalance += openBal.Balance[openBal.Balance.length - 1].remaining_gold_balance
        } else {
          openingBalance += openBal.total_price
        }
      }


    }

    const billInfo = await prisma.masterOrder.findMany({
      where: filters,
      include: {
        Balance: true,
        OrderItems:true
      },
    });
    console.log(closingBalance)
    const data = {
      billInfo,
      openingBalance,
      closingAmount: closingBalance? closingBalance.closing_balance : 0
    }
    res.send({ data: data });

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Something went wrong" });
  }
};


// getCustomerBillDetails based on today date
// const getCustomerBillDetails = async (req, res) => {
//   try {
//     // Get today's start and end time
//     const today = new Date();
//     const startOfDay = new Date(today.setHours(0, 0, 0, 0));
//     const endOfDay = new Date(today.setHours(23, 59, 59, 999));

//     const billInfo = await prisma.masterOrder.findMany({
//       where: {
//         created_at: {
//           gte: startOfDay,
//           lte: endOfDay,
//         }
//       },
//       include: {
//         Balance: true,
//       },
//     });

//     res.send({ billInfo });

//   } catch (err) {
//     console.error(err);
//     res.status(500).send({ error: 'Something went wrong' });
//   }
// };



//getSalesBillDetails 

const getSalesBillDetails = async (req, res) => {
  try {
    const billInfo = await prisma.masterOrder.findMany({
      include: {
        CustomerInfo: true,
      }
    })
    res.send({ 'billInfo': billInfo })

  } catch (err) {
    res.send(err)
  }
}
//updateBill
const updateBill = async (req, res) => {
  const order_id = req.params.id;
  const balanceData = req.body

  const closing = balanceData[balanceData.length - 1].closing

  try {
    for (const bal of balanceData) {

      if (bal.balance_id === 0) {
        const newBalance = await prisma.balance.create({
          data: {
            order_id: parseInt(order_id),
            customer_id: bal.customer_id,
            gold_weight: parseFloat(bal.gold_weight),
            gold_touch: parseFloat(bal.gold_touch),
            gold_pure: parseFloat(bal.gold_pure),
            remaining_gold_balance: parseFloat(closing)
          }
        })
        const existingClosing = await prisma.closingBalance.findFirst({
          where: {
            customer_id: newBalance.customer_id
          }

        })
        const updateValue = existingClosing.closing_balance - newBalance.gold_pure
        await prisma.closingBalance.update({
          where: {
            customer_id: newBalance.customer_id
          },
          data: {
            closing_balance: parseFloat(updateValue)
          }
        })
      } else {

        if (!bal.balance_id) {
          console.log("Skipping invalid balance", bal);
          continue; // skip to next
        }
        console.log('balance update', bal.balance_id, order_id, bal.customer_id, bal.gold_weight, bal.gold_touch, bal.gold_pure, closing)
        //balance update

        const existingGoldWeight = await prisma.balance.findFirst({
          where: {
            balance_id: bal.balance_id
          },
          select: {
            gold_pure: true
          }
        })
        const existingClosing = await prisma.closingBalance.findFirst({
          where: {
            customer_id: bal.customer_id
          },
          select: {
            closing_balance: true
          }
        })
        const addClosing = parseFloat(existingGoldWeight.gold_pure) + parseFloat(existingClosing.closing_balance)
        console.log('addclosing', addClosing)
        await prisma.closingBalance.update({
          where: {
            customer_id: bal.customer_id
          },
          data: {
            closing_balance: parseInt(addClosing)
          }
        })
        const updateBal = await prisma.balance.updateMany({
          where: {
            balance_id: parseInt(bal.balance_id)
          },
          data: {
            order_id: parseInt(order_id),
            customer_id: bal.customer_id,
            gold_weight: parseFloat(bal.gold_weight),
            gold_touch: parseFloat(bal.gold_touch),
            gold_pure: parseFloat(bal.gold_pure),
            remaining_gold_balance: parseFloat(closing)
          }
        });
        //closing update

        const newClose = addClosing - parseFloat(bal.gold_pure)
        console.log('newClose', newClose)
        await prisma.closingBalance.update({
          where: {
            customer_id: bal.customer_id
          },
          data: {
            closing_balance: parseFloat(newClose)
          }
        })


      }
    }
    res.status(200).json({ message: " Bill Update Suceess" })
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Error on Update bill" })
  }

}
module.exports = { saveBill, getBill, updateBill, getSalesBillDetails, getCustomerBillWithDate }