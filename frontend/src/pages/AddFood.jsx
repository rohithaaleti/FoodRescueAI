import "./AddFood.css";
import { useState } from "react";
import api from "../api/client";

const AddFood = () => {

  const [food, setFood] = useState({
    food_name: "",
    quantity: "",
    food_type: "",
    expiry_time: "",
    pickup_address: "",
    pickup_latitude: "",
    pickup_longitude: "",
    description: ""
  });

  const handleChange = (e) => {
    setFood({
      ...food,
      [e.target.name]: e.target.value
    });
  };

  const handleDetectLocation = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(7));
        const lon = Number(pos.coords.longitude.toFixed(7));
        setFood((prev) => ({
          ...prev,
          pickup_latitude: String(lat),
          pickup_longitude: String(lon)
        }));
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to retrieve location. Please check browser permissions or enter coordinates manually.");
      }
    );
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const response = await api.post(
        "/api/food",
        food
      );

      const data = response.data;

      if (response.status >= 200 && response.status < 300) {

        alert("Food Donation Added Successfully ✅");

        setFood({
          food_name: "",
          quantity: "",
          food_type: "",
          expiry_time: "",
          pickup_address: "",
          pickup_latitude: "",
          pickup_longitude: "",
          description: ""
        });

      } else {

        alert(data.error || data.message || "Failed to add donation");

      }

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Server Error"
      );

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
          maxLength={200}
          value={food.food_name}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          placeholder="Quantity (e.g. 50 Plates)"
          name="quantity"
          maxLength={20}
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
          maxLength={500}
          value={food.pickup_address}
          onChange={handleChange}
          required
        />

        <div className="coordinates-group">
          <div className="coordinates-header">
            <span>GPS Coordinates (Optional)</span>
            <button
              type="button"
              className="detect-btn"
              onClick={handleDetectLocation}
            >
              📍 Detect Current Location
            </button>
          </div>
          <div className="coordinates-inputs">
            <input
              type="number"
              step="any"
              placeholder="Pickup Latitude (-90 to 90)"
              name="pickup_latitude"
              value={food.pickup_latitude}
              onChange={handleChange}
            />
            <input
              type="number"
              step="any"
              placeholder="Pickup Longitude (-180 to 180)"
              name="pickup_longitude"
              value={food.pickup_longitude}
              onChange={handleChange}
            />
          </div>
        </div>

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