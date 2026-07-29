import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const EditDonation = () => {

    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        food_name: "",
        quantity: "",
        food_type: "",
        expiry_time: "",
        pickup_address: "",
        image_url: ""
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDonation();
    }, []);

    const fetchDonation = async () => {

        try {

            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:5000/api/food/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {

                const donation = data.donation;

                setFormData({
                    food_name: donation.food_name,
                    quantity: donation.quantity,
                    food_type: donation.food_type,
                    expiry_time: donation.expiry_time.slice(0, 16),
                    pickup_address: donation.pickup_address,
                    image_url: donation.image_url || ""
                });

            } else {

                alert(data.message);
                navigate("/my-donations");

            }

        } catch (err) {

            console.log(err);
            alert("Failed to load donation.");

        }

        setLoading(false);

    };

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:5000/api/food/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                }
            );

            const data = await response.json();

            if (data.success) {

                alert("Donation Updated Successfully!");
                navigate("/my-donations");

            } else {

                alert(data.message);

            }

        } catch (err) {

            console.log(err);
            alert("Something went wrong.");

        }

    };

    if (loading) {

        return <h2>Loading...</h2>;

    }

    return (

        <div className="container">

            <h1>Edit Donation</h1>

            <form onSubmit={handleSubmit}>

                <div>

                    <label>Food Name</label>

                    <input
                        type="text"
                        name="food_name"
                        value={formData.food_name}
                        onChange={handleChange}
                        required
                    />

                </div>

                <br />

                <div>

                    <label>Quantity</label>

                    <input
                        type="text"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        required
                    />

                </div>

                <br />

                <div>

                    <label>Food Type</label>

                    <select
                        name="food_type"
                        value={formData.food_type}
                        onChange={handleChange}
                    >
                        <option value="Veg">Veg</option>
                        <option value="Non-Veg">Non-Veg</option>
                    </select>

                </div>

                <br />

                <div>

                    <label>Expiry Time</label>

                    <input
                        type="datetime-local"
                        name="expiry_time"
                        value={formData.expiry_time}
                        onChange={handleChange}
                        required
                    />

                </div>

                <br />

                <div>

                    <label>Pickup Address</label>

                    <textarea
                        name="pickup_address"
                        value={formData.pickup_address}
                        onChange={handleChange}
                        required
                    />

                </div>

                <br />

                <div>

                    <label>Image URL</label>

                    <input
                        type="text"
                        name="image_url"
                        value={formData.image_url}
                        onChange={handleChange}
                    />

                </div>

                <br />

                <button type="submit">
                    Update Donation
                </button>

            </form>

        </div>

    );

};

export default EditDonation;