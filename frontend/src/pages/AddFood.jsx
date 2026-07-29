import "./AddFood.css";
import { useState } from "react";

const AddFood = () => {

  const [food, setFood] = useState({
    food_name: "",
    quantity: "",
    food_type: "",
    expiry_time: "",
    pickup_address: "",
    description: ""
  });

  const handleChange = (e) => {
    setFood({
      ...food,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/food",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },

          body: JSON.stringify(food)
        }
      );

      const data = await response.json();

      if (response.ok) {

        alert("Food Donation Added Successfully ✅");

        setFood({
          food_name: "",
          quantity: "",
          food_type: "",
          expiry_time: "",
          pickup_address: "",
          description: ""
        });

      } else {

        alert(data.error || data.message);

      }

    } catch (err) {

      console.log(err);

      alert("Server Error");

    }

  };

  return (

    <div className="add-food-page">

      <form
        className="food-form"
        onSubmit={handleSubmit}
      >

        <h1>Add Food Donation</h1>

        <input
          type="text"
          placeholder="Food Name"
          name="food_name"
          value={food.food_name}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          placeholder="Quantity (e.g. 50 Plates)"
          name="quantity"
          value={food.quantity}
          onChange={handleChange}
          required
        />

        <select
          name="food_type"
          value={food.food_type}
          onChange={handleChange}
          required
        >

          <option value="">
            Select Food Type
          </option>

          <option value="Veg">
            Veg
          </option>

          <option value="Non-Veg">
            Non-Veg
          </option>

          <option value="Vegan">
            Vegan
          </option>

          <option value="Other">
            Other
          </option>

        </select>

        <input
          type="datetime-local"
          name="expiry_time"
          value={food.expiry_time}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          placeholder="Pickup Address"
          name="pickup_address"
          value={food.pickup_address}
          onChange={handleChange}
          required
        />

        <textarea
          rows="5"
          placeholder="Description"
          name="description"
          value={food.description}
          onChange={handleChange}
        />

        <button type="submit">
          Add Donation
        </button>

      </form>

    </div>

  );

};

export default AddFood;