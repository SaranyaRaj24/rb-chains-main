
import React, { useState, useEffect, useRef } from "react";
import { Autocomplete, TextField, Box, Button, Table, TableHead, TableCell, TableRow, TableBody } from "@mui/material";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Height } from "@mui/icons-material";
import style from "./billing.module.css";


const Billing = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [billId, setBillId] = useState("")
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const billRef = useRef();
  const [products, setProducts] = useState([]);
  const [productWeight, setProductWeight] = useState([])
  const [totalPrice, setTotalPrice] = useState(0)
  const [totalBillAmount, setTotalBillAmount] = useState(0)
  const [customerClosing, setCustomerClosing] = useState(0)
  const [balanceRow, setBalanceRow] = useState([])
  const [closing, setClosing] = useState(0)
  const [pure, setPure] = useState(0)
  const navigate = useNavigate()


  const handleProductSelect = (itemIndex, stockId) => {
    const tempProducts = [...productWeight]
    let customerData
    const tempSelectProduct = tempProducts.filter((item, index) => itemIndex === index)
    console.log('masterjewelid', selectedProduct.master_jewel_id)
    if (selectedCustomer) {
      customerData = customers.filter((item, index) => item.customer_id === selectedCustomer.customer_id)
    } else {
      alert('Select Customer Name')
      return
    }
    const filterMasterItem = customerData[0].MasterJewelTypeCustomerValue.filter((item, index) => item.masterJewel_id === selectedProduct.master_jewel_id)
    if (filterMasterItem.length === 0) {
      alert('Percentage is Required')
    } else {
      const billObj = {
        productName: tempSelectProduct[0].item_name,
        productTouch: tempSelectProduct[0].touchValue,
        productWeight: tempSelectProduct[0].value,
        productPure: 0,
        productPercentage: 0,
        stockId: stockId
      }
      console.log('testing', billObj)
      billObj.productPure = ((billObj.productTouch + filterMasterItem[0].value) * billObj.productWeight) / 100
      billObj.productPercentage = filterMasterItem[0].value
      console.log('pure', billObj.productPure)
      const tempBill = [...billItems]
      tempBill.push(billObj)
      setBillItems(tempBill)
      tempProducts.splice(itemIndex, 1)
      setProductWeight(tempProducts)

    }


  };
  const handleSaveBill = async () => {
    // validation for bill
    if (!selectedCustomer) {
      alert('Customer Name is Required')
    }
    if (!selectedProduct) {
      alert('Jewel Name is Required')
    }

    else {
      if (billItems.length === 0) {
        alert('Order Items is Required ')
        return;
      }
      if (selectedCustomer) {

        const payLoad = {
          "customer_id": selectedCustomer.customer_id,
          "order_status": "completed",
          "totalPrice": totalPrice,
          "orderItems": billItems,
          "oldBalance": customerClosing,
          "balance": balanceRow,
          "closingbalance": balanceRow.length === 0 ? totalBillAmount : closing

        }
        console.log('payload', payLoad)

        try {
          const response = await axios.post(`${process.env.REACT_APP_BACKEND_SERVER_URL}/api/bill/saveBill`, payLoad);
          if (response.status === 201) {
            console.log(response.data.data.id)
            toast.success("Bill Created SucessFully", { autoClose: 1000 });

            setBillId(response.data.data.id)
            const cells = document.querySelectorAll('.merge-cell');

            window.onbeforeprint = () => {
              cells.forEach(td => td.setAttribute('colspan', '3'));
            };
            window.onafterprint = () => {
              cells.forEach(td => td.setAttribute('colspan', '4'));
            };

            window.print();

          }
        } catch (err) {
          alert(err.message)
        }
      } else {
        alert('Products is Required')
      }
    }
  }
  const calculateTotal = (billItems) => {
    return billItems.reduce((acc, currValue) => {
      return acc + currValue.productPure
    }, 0)
  };

  const calculateLess = (total) => {
    const lessValue = (total * 0.9992).toFixed(3);
    return lessValue;
  };

  const calculateClosing = (balanceRow) => {
    return balanceRow.reduce((acc, currValue) => {

      return acc + currValue.pure
    }, 0)
  };

  const handleBalanceRow = () => {
    if (selectedCustomer) {
      if (selectedProduct) {
        if (billItems.length >= 1) {
          const tempRow = [...balanceRow, { 'customer_id': selectedCustomer.customer_id, 'givenGold': 0, 'touch': 0, 'pure': 0 }]
          setBalanceRow(tempRow)
        } else {
          toast.warning('Select Product Weight', { autoClose: 2000 })
        }
      } else {
        toast.warning('Select Product Name', { autoClose: 2000 })
      }
    } else {
      toast.warning('Select Customer Name', { autoClose: 2000 })
    }
  }

  const handleBalanceInputChange = (index, field, value) => {
    const updatedRows = [...balanceRow];
    updatedRows[index][field] = value;

    if (field === "touch" || field === "givenGold") {
      updatedRows[index]['pure'] = updatedRows[index]['givenGold'] * updatedRows[index]['touch'] / 100;
    }

    setBalanceRow(updatedRows);
  };
  const handleRemoveBalanceRow = (index) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this balance row?");

    if (confirmDelete) {
      const tempBalRow = [...balanceRow];
      tempBalRow.splice(index, 1);
      setBalanceRow(tempBalRow);
    }
  };
  const handleChangePercentage = (itemIndex, value) => {
    const tempBill = [...billItems]
    const filteredbill = tempBill.filter((item, index) => index === itemIndex)
    filteredbill[0].productPercentage = parseInt(value)
    filteredbill[0].productPure = ((filteredbill[0].productTouch + parseInt(value)) * filteredbill[0].productWeight) / 100
    tempBill.splice(itemIndex, 1, filteredbill[0])
    setBillItems(tempBill)
  }
  const handleRemoveOrder = (index, item_name, touchValue, value, stock_id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this order item?");

    if (confirmDelete) {
      console.log(item_name, touchValue, value, stock_id);

      const tempBill = [...billItems];
      tempBill.splice(index, 1);
      setBillItems(tempBill);

      const tempProduct = [...productWeight];
      tempProduct.push({ item_name, stock_id, touchValue, value });
      setProductWeight(tempProduct);
    }
  };
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_SERVER_URL}/api/customer/getCustomerValueWithPercentage`
        );
        console.log("Fetched Customers:", response.data);

        setCustomers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        toast.error("Error fetching customers!", {
          containerId: "custom-toast",
        });
        console.error("Error:", error);
      }
    };

    const fetchJewelItem = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_SERVER_URL}/api/jewelType/getJewelType`
        );
        console.log("Fetched JewelItems:", response.data.allJewel);

        setProducts(Array.isArray(response.data.allJewel) ? response.data.allJewel : []);
      } catch (error) {
        toast.error("Error fetching customers!", {
          containerId: "custom-toast",
        });
        console.error("Error:", error);
      }
    };

    fetchCustomers();
    fetchJewelItem();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDate(now.toLocaleDateString("en-IN"));
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => {

      if (balanceRow.length === 0) {
        setClosing(totalBillAmount)
      } else {
        setClosing(totalBillAmount - calculateClosing(balanceRow))
        setPure(calculateClosing(balanceRow))
      }

    }, [balanceRow]

  )
  // calculate total billAmount with old balance

  useEffect(() => {

    setTotalPrice(calculateTotal(billItems))

    if (billItems.length >= 1) {
      setTotalBillAmount(Number(calculateTotal(billItems)) + Number(customerClosing))
    } else {
      setTotalBillAmount(0)
    }

  }, [billItems])

  useEffect(() => {
    if (selectedProduct) {
      console.log('selectedProductId', selectedProduct.master_jewel_id)
      const fetchWeight = async () => {
        try {
          const productsWeight = await axios.get(`${process.env.REACT_APP_BACKEND_SERVER_URL}/api/jewelType/getProductWeight/${selectedProduct.master_jewel_id}`)

          setProductWeight(productsWeight.data.productsWeight)
          console.log('productFinish', productsWeight.data.productsWeight)

        } catch (err) {
          if (err.status === 400) {
            setProductWeight([])
          }
          if (err.status === 500) {
            alert("server Error")
          } else {
            toast.error('No Products')
          }
        }
      }
      fetchWeight()
    }

  }, [selectedProduct]);

  useEffect(() => {
    const fetchClosingBalance = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_SERVER_URL}/api/customer/closing/${selectedCustomer.customer_id}`)
        console.log(response.data.closingBalance)
        setCustomerClosing(response.data.closingBalance)

      } catch (err) {
        alert(err.message)
      }
    }
    if (selectedCustomer) {
      fetchClosingBalance()
    }
  }, [selectedCustomer])


  useEffect(() => {

    setBillItems([])

    const fetchWeight = async () => {
      try {
        const productsWeight = await axios.get(`${process.env.REACT_APP_BACKEND_SERVER_URL}/api/jewelType/getProductWeight/${selectedProduct.master_jewel_id}`)

        setProductWeight(productsWeight.data.productsWeight)
        console.log('productFinish', productsWeight.data.productsWeight)

      } catch (err) {
        if (err.status === 400) {
          setProductWeight([])
        }
        if (err.status === 500) {
          alert("server Error")
        } else {
          toast.error('No Products')
        }
      }
    }
    if (selectedProduct) {
      fetchWeight()
    }
  }, [selectedCustomer])

  return (
    <Box sx={styles.wrapper} className="billingWrapper">
      <Box sx={styles.leftPanel} ref={billRef}>
        <h1 style={styles.heading}>Estimate Only</h1>
        <Box sx={styles.billHeader}>
          <Box sx={styles.billNumber}>
            <p><strong>Bill No:{billId}</strong></p>
          </Box>
          <Box sx={styles.billInfo}>

            <p>
              <strong>Date:</strong> {date} <br />
              <br></br>
              <strong>Time:</strong> {time}
            </p>
          </Box>

        </Box>

        {!isPrinting && (<Box
          sx={styles.searchSection}
          style={{ display: isPrinting ? "none" : "flex" }}
          className={style.noprint}

        >
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.customer_name || ""}

            onChange={(event, newValue) => setSelectedCustomer(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Customer"
                variant="outlined"
                size="small"
              />
            )}
            sx={styles.smallAutocomplete}
          />

          <Autocomplete
            options={products}
            getOptionLabel={(option) => option.jewel_name || ""}
            onChange={(event, newValue) => setSelectedProduct(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Product Name"
                variant="outlined"
                size="small"
              />
            )}
            sx={styles.smallAutocomplete}
          />
        </Box>)}

        {selectedCustomer && (
          <Box sx={styles.customerDetails}>
            {!isPrinting && (<h3 className={style.noprint}>Customer Details:</h3>)}
            <p>
              <strong>Name:</strong> {selectedCustomer.customer_name}
            </p>
            {/* {selectedCustomer.address && (
              <p>
                <strong>Address:</strong> {selectedCustomer.address}
              </p>
            )}
            {selectedCustomer.phone_number && (
              <p>
                <strong>Phone:</strong> {selectedCustomer.phone_number}
              </p>
            )}
            {selectedCustomer.customer_shop_name && (
              <p>
                <strong>Shop Name:</strong> {selectedCustomer.customer_shop_name}
              </p>
            )} */}
          </Box>
        )}

        <Box sx={styles.itemsSection} className="table">
          {!isPrinting && (<h3 className={style.noprint}>Bill Details:</h3>)}
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Touch</th>
                {!isPrinting && (<th style={styles.th} className={style.noprint}>%</th>)}
                <th style={styles.th}>Weight</th>
                <th style={styles.th}>Pure</th>
                {!isPrinting && (<th style={styles.th} className={style.noprint}>Action</th>)}
              </tr>
            </thead>
            <tbody >
              {billItems.length > 0 ? (
                billItems.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{item.productName}</td>
                    <td style={styles.td}>{item.productTouch}</td>
                    {!isPrinting && (<td style={styles.td} className={style.noprint}><input value={item.productPercentage} type="number" onChange={(e) => { handleChangePercentage(index, e.target.value) }} ></input></td>)}
                    <td style={styles.td}>{item.productWeight}</td>
                    <td style={styles.td} className="table">{(item.productPure).toFixed(3)}</td>
                    {!isPrinting && (<td style={styles.td} className={style.noprint}><Button onClick={() => { handleRemoveOrder(index, item.productName, item.productTouch, item.productWeight, item.stockId) }}><FaTrash></FaTrash></Button></td>)}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    style={{ textAlign: "center", padding: "10px" }}
                  >
                    No products selected
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan="4" style={styles.td} className="merge-cell">
                  <strong>Bill Total</strong>
                </td>
                <td style={styles.td}>{(totalPrice).toFixed(3)}</td>

              </tr>
              {selectedCustomer && (
                <tr>
                  <td colSpan="4" style={styles.td} className="merge-cell">
                    <strong>Old Balance</strong>
                  </td>
                  <td style={styles.td}>{customerClosing}</td>

                </tr>)}
              <tr>
                <td colSpan="4" style={styles.td} className="merge-cell">
                  <strong>Total Amount</strong>
                </td>
                <td style={styles.td}>{(totalBillAmount).toFixed(3)}</td>

              </tr>
              <tr>

                {!isPrinting && (<td>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleBalanceRow}
                    sx={styles.balanceButton}
                    style={{ display: isPrinting ? "none" : "block" }}
                    className={style.noprint}

                  >
                    +
                  </Button></td>
                )}

              </tr>
            </tbody>
          </table>
          {!isPrinting && (<h3 className={style.noprint}>Recevied Details:</h3>)}
          {!isPrinting && (
          
             <Box className={style.noprint}>
              <Table className={style.receivedtable}>
            <TableHead>
              <TableRow>
                <TableCell>Given Gold</TableCell>
                <TableCell>Touch</TableCell>
                <TableCell>Weight</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {balanceRow.map((row, index) => (
                <TableRow key={index}>
                  <TableCell >
                    <input
                      type="number"
                      value={row.givenGold}
                      onChange={(e) =>
                        handleBalanceInputChange(index, "givenGold", e.target.value)
                      }
                      style={styles.input}
                    />
                  </TableCell>

                  <TableCell>
                    <input
                      type="number"
                      placeholder="Touch"
                      value={row.touch}
                      onChange={(e) =>
                        handleBalanceInputChange(index, "touch", e.target.value)
                      }
                      style={styles.input}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      placeholder="Weight"
                      value={(row.pure).toFixed(3)}
                      style={styles.input}
                    />
                  </TableCell>
                  <TableCell>
                    {
                      !isPrinting && (<Button style={styles.delButton} className={style.noprint} onClick={(e) => { handleRemoveBalanceRow(index) }}><FaTrash></FaTrash></Button>)
                    }
                  </TableCell>

                </TableRow>
              ))}
             
            </TableBody>
          </Table>
             </Box>
            )}
          
        </Box>

        <Box style={styles.closingBox}>

          <p style={styles.closingLine} >
            <span>Recevied</span> 
            <span >{(pure).toFixed(3)}</span>
            
          </p>

          <p style={styles.closingLine}>
            <span>closing</span> 
            <span >{(balanceRow.length === 0 ? totalBillAmount : closing).toFixed(2)}</span>
            
          </p>
        </Box>


        {
          !isPrinting && (

            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveBill}
              sx={styles.saveButton}
              style={{ display: isPrinting ? "none" : "block" }}
              className={style.noprint}
            >
              Save
            </Button>)
        }
      </Box>

      {
        !isPrinting && (
          <Box sx={styles.rightPanel} className={style.noprint}>
            <Table sx={styles.table} >
              <TableHead>
                <TableRow>
                  <TableCell sx={styles.th}>S.No</TableCell>
                  <TableCell sx={styles.th}>Product Finish Weight</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productWeight.length > 0 ? (
                  productWeight.map((product, index) => (
                    <TableRow key={index} onClick={() => { handleProductSelect(index, product.stock_id) }} style={{ cursor: 'pointer' }}>
                      <TableCell sx={styles.td}>{index + 1}</TableCell>
                      <TableCell sx={styles.td}>{product.value}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell sx={styles.td} colSpan={2}>
                      No product weight data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ToastContainer />
          </Box>
        )
      }
    </Box>

  );
};

const styles = {
  wrapper: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-start",
    padding: "20px",
  },
  leftPanel: {
    width: "60%",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
  },
  rightPanel: {
    width: "40%",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    backgroundColor: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  heading: { textAlign: "center", color: "black", fontSize: "20px" },
  billInfo: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  searchSection: { display: "flex", gap: "10px", marginBottom: "20px" },
  smallAutocomplete: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: "5px",
  },
  customerDetails: {
    marginBottom: "20px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    backgroundColor: "#fff",
  },
  itemsSection: { marginTop: "20px" },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed", // Forces all cells to respect width
  },
  th: {
    border: "1px solid #ddd",
    padding: "5px",
    backgroundColor: "#f2f2f2",
    textAlign: "left",
    fontWeight: "bold",
    width: "16.66%", // For 6 columns (100 / 6)
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  td: {
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "left",
    width: "16.66%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  saveButton: {
    marginTop: "20px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
  balanceButton: {
    // margin: "10px",
    // display: "block",
    // marginLeft: "auto",
    marginRight: "0",
    fontSize: "18 px",
    marginLeft: "60rem",
    marginTop: "1rem"
  },

  input: {
    padding: "6px 8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
    backgroundColor: "#fff",
    boxSizing: "border-box",
    outline: "none",
  },

  delButton: {
    margin: "10px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    fontSize: "20px"
  },
  billHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "2px"
  },
  billNumber: {
    flex: 1
  },
  billInfo: {
    flex: 1,
    textAlign: "right",
    marginBottom: "20px",

  },
  closingBox:{
    width: "60%",
    padding: "20px",
    marginLeft:"130px",
    
  },
  closingLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "0 0 14px 0",       // reset default <p> margins
    padding: "4px 0",
     // optional vertical padding
  }
  
  
};


export default Billing;




