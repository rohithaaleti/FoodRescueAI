import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import NotificationBell from "../components/NotificationBell";
import "./NGOProfile.css";

const ALL_FOOD_TYPES = ["Veg", "Non-Veg", "Vegan", "Other"];

function NGOProfile() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    // Read-only user details
    const [orgDetails, setOrgDetails] = useState({
        organization_name: "",
        full_name: "",
        email: "",
        phone: "",
        address: ""
    });

    // Editable form state
    const [formData, setFormData] = useState({
        max_capacity: "100",
        max_active_donations: "3",
        is_active: true,
        latitude: "",
        longitude: "",
        supported_food_types: ["Veg", "Non-Veg", "Vegan", "Other"]
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.get("/api/ngo/profile");
            if (response.data && response.data.success && response.data.profile) {
                const p = response.data.profile;

                setOrgDetails({
                    organization_name: p.organization_name || "",
                    full_name: p.full_name || "",
                    email: p.email || "",
                    phone: p.phone || "",
                    address: p.address || ""
                });

                let parsedFoodTypes = [];
                if (Array.isArray(p.supported_food_types)) {
                    parsedFoodTypes = p.supported_food_types;
                } else if (typeof p.supported_food_types === "string") {
                    parsedFoodTypes = p.supported_food_types
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean);
                }

                setFormData({
                    max_capacity: p.max_capacity !== null && p.max_capacity !== undefined ? String(p.max_capacity) : "100",
                    max_active_donations: p.max_active_donations !== null && p.max_active_donations !== undefined ? String(p.max_active_donations) : "3",
                    is_active: p.is_active === 1 || p.is_active === true,
                    latitude: p.latitude !== null && p.latitude !== undefined ? String(p.latitude) : "",
                    longitude: p.longitude !== null && p.longitude !== undefined ? String(p.longitude) : "",
                    supported_food_types: parsedFoodTypes.length > 0 ? parsedFoodTypes : ["Veg", "Non-Veg", "Vegan", "Other"]
                });
            }
        } catch (err) {
            console.error("Failed to load NGO profile:", err);
            setErrorMessage(err.response?.data?.message || "Failed to load NGO profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));

        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const handleFoodTypeToggle = (type) => {
        setFormData((prev) => {
            const current = [...prev.supported_food_types];
            const exists = current.includes(type);
            const updated = exists
                ? current.filter((t) => t !== type)
                : [...current, type];

            return {
                ...prev,
                supported_food_types: updated
            };
        });

        if (fieldErrors.supported_food_types) {
            setFieldErrors((prev) => {
                const updated = { ...prev };
                delete updated.supported_food_types;
                return updated;
            });
        }
    };

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(7));
                const lon = Number(pos.coords.longitude.toFixed(7));
                setFormData((prev) => ({
                    ...prev,
                    latitude: String(lat),
                    longitude: String(lon)
                }));
                setFieldErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.latitude;
                    delete updated.longitude;
                    return updated;
                });
            },
            (err) => {
                console.error("Geolocation error:", err);
                alert("Unable to retrieve location. Please check browser permissions or enter coordinates manually.");
            }
        );
    };

    const validateForm = () => {
        const errors = {};

        // max_capacity > 0
        const capacityNum = Number(formData.max_capacity);
        if (!formData.max_capacity || isNaN(capacityNum) || capacityNum <= 0 || !Number.isInteger(capacityNum)) {
            errors.max_capacity = "Max capacity must be a positive whole number greater than 0.";
        }

        // max_active_donations > 0
        const activeDonationsNum = Number(formData.max_active_donations);
        if (!formData.max_active_donations || isNaN(activeDonationsNum) || activeDonationsNum <= 0 || !Number.isInteger(activeDonationsNum)) {
            errors.max_active_donations = "Max active donations must be a positive whole number greater than 0.";
        }

        // latitude between -90 and 90 when provided
        if (formData.latitude !== "" && formData.latitude !== null && formData.latitude !== undefined) {
            const lat = Number(formData.latitude);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                errors.latitude = "Latitude must be a valid number between -90 and 90.";
            }
        }

        // longitude between -180 and 180 when provided
        if (formData.longitude !== "" && formData.longitude !== null && formData.longitude !== undefined) {
            const lon = Number(formData.longitude);
            if (isNaN(lon) || lon < -180 || lon > 180) {
                errors.longitude = "Longitude must be a valid number between -180 and 180.";
            }
        }

        // supported_food_types validation
        if (!formData.supported_food_types || formData.supported_food_types.length === 0) {
            errors.supported_food_types = "Please select at least one supported food type.";
        } else {
            const invalid = formData.supported_food_types.filter((t) => !ALL_FOOD_TYPES.includes(t));
            if (invalid.length > 0) {
                errors.supported_food_types = `Supported food types must contain only supported values: ${ALL_FOOD_TYPES.join(", ")}`;
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage(null);
        setErrorMessage(null);

        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            const payload = {
                max_capacity: parseInt(formData.max_capacity, 10),
                max_active_donations: parseInt(formData.max_active_donations, 10),
                is_active: formData.is_active ? 1 : 0,
                latitude: formData.latitude !== "" ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude !== "" ? parseFloat(formData.longitude) : null,
                supported_food_types: formData.supported_food_types
            };

            const response = await api.put("/api/ngo/profile", payload);
            if (response.data && response.data.success) {
                setStatusMessage("Matching profile settings saved successfully! ✅");
                setTimeout(() => setStatusMessage(null), 5000);
            } else {
                setErrorMessage(response.data?.message || "Failed to update profile.");
            }
        } catch (err) {
            console.error("Failed to update profile:", err);
            setErrorMessage(err.response?.data?.message || "Server Error while saving profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="ngo-profile-page">
                <div className="ngo-profile-container">
                    <div className="ngo-profile-card loading-spinner">
                        Loading NGO profile settings...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ngo-profile-page">
            <div className="ngo-profile-container">
                <div className="ngo-profile-nav">
                    <button
                        type="button"
                        className="ngo-nav-btn"
                        onClick={() => navigate("/ngo")}
                    >
                        ← Back to Dashboard
                    </button>
                    <div className="ngo-profile-nav-buttons" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <button
                            type="button"
                            className="ngo-nav-btn"
                            onClick={() => navigate("/ngo/my-donations")}
                        >
                            My Accepted Donations
                        </button>
                        <NotificationBell />
                    </div>
                </div>

                <div className="ngo-profile-card">
                    <div className="ngo-profile-header">
                        <h1>NGO Matching Profile & Settings</h1>
                        <p>Configure your capacity, supported diets, location, and matching eligibility for smart donations.</p>
                    </div>

                    {statusMessage && (
                        <div className="alert-banner alert-success">
                            <span>{statusMessage}</span>
                            <button
                                type="button"
                                onClick={() => setStatusMessage(null)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="alert-banner alert-error">
                            <span>{errorMessage}</span>
                            <button
                                type="button"
                                onClick={() => setErrorMessage(null)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {orgDetails.organization_name && (
                        <div className="ngo-org-summary">
                            <div className="ngo-org-summary-title">Organization Account</div>
                            <div className="ngo-org-grid">
                                <div className="ngo-org-item">
                                    Organization
                                    <strong>{orgDetails.organization_name}</strong>
                                </div>
                                <div className="ngo-org-item">
                                    Contact Representative
                                    <strong>{orgDetails.full_name || "N/A"}</strong>
                                </div>
                                <div className="ngo-org-item">
                                    Email
                                    <strong>{orgDetails.email || "N/A"}</strong>
                                </div>
                                <div className="ngo-org-item">
                                    Phone
                                    <strong>{orgDetails.phone || "N/A"}</strong>
                                </div>
                                {orgDetails.address && (
                                    <div className="ngo-org-item" style={{ gridColumn: "1 / -1" }}>
                                        Registered Address
                                        <strong>{orgDetails.address}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Status Toggle */}
                        <div className="form-group">
                            <label className="active-toggle-container">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                />
                                <div className="active-toggle-text">
                                    <strong>Active for Smart NGO Matching</strong>
                                    <span>
                                        {formData.is_active
                                            ? "Your organization is currently available to receive and be recommended for incoming surplus food donations."
                                            : "Your organization is paused and will not receive smart match recommendations until re-activated."}
                                    </span>
                                </div>
                            </label>
                        </div>

                        {/* Capacity & Workload */}
                        <div className="form-section-title">📦 Capacity & Workload Controls</div>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label htmlFor="max_capacity">Max Storage Capacity (Plates/Units) *</label>
                                <input
                                    id="max_capacity"
                                    type="number"
                                    name="max_capacity"
                                    min="1"
                                    step="1"
                                    placeholder="e.g. 100"
                                    className={`form-input ${fieldErrors.max_capacity ? "has-error" : ""}`}
                                    value={formData.max_capacity}
                                    onChange={handleInputChange}
                                />
                                {fieldErrors.max_capacity && (
                                    <div className="field-error">{fieldErrors.max_capacity}</div>
                                )}
                                <div className="help-text">Maximum food items/meals your facility can accept per single donation (must be &gt; 0).</div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="max_active_donations">Max Concurrent Active Donations *</label>
                                <input
                                    id="max_active_donations"
                                    type="number"
                                    name="max_active_donations"
                                    min="1"
                                    step="1"
                                    placeholder="e.g. 3"
                                    className={`form-input ${fieldErrors.max_active_donations ? "has-error" : ""}`}
                                    value={formData.max_active_donations}
                                    onChange={handleInputChange}
                                />
                                {fieldErrors.max_active_donations && (
                                    <div className="field-error">{fieldErrors.max_active_donations}</div>
                                )}
                                <div className="help-text">Concurrent active pickups/deliveries your NGO can handle simultaneously (must be &gt; 0).</div>
                            </div>
                        </div>

                        {/* Supported Food Types */}
                        <div className="form-section-title">🥗 Supported Food Categories *</div>
                        <div className="form-group">
                            <label>Select all food types your organization is equipped to receive and distribute:</label>
                            <div className="checkbox-group-wrapper">
                                {ALL_FOOD_TYPES.map((type) => {
                                    const isChecked = formData.supported_food_types.includes(type);
                                    return (
                                        <label
                                            key={type}
                                            className={`checkbox-chip ${isChecked ? "active" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleFoodTypeToggle(type)}
                                            />
                                            {type}
                                        </label>
                                    );
                                })}
                            </div>
                            {fieldErrors.supported_food_types && (
                                <div className="field-error">{fieldErrors.supported_food_types}</div>
                            )}
                            <div className="help-text">Only donations matching your selected food categories will be matched with your NGO.</div>
                        </div>

                        {/* Geographic Coordinates */}
                        <div className="form-section-title">📍 Facility Geographic Coordinates</div>
                        <div className="form-group">
                            <label>GPS Coordinates for Proximity & Distance Calculation</label>
                            <div className="geo-actions">
                                <button
                                    type="button"
                                    className="geo-btn"
                                    onClick={handleDetectLocation}
                                >
                                    📍 Detect Current Location
                                </button>
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label htmlFor="latitude">Latitude (-90 to 90)</label>
                                <input
                                    id="latitude"
                                    type="number"
                                    name="latitude"
                                    step="any"
                                    placeholder="e.g. 12.9715987"
                                    className={`form-input ${fieldErrors.latitude ? "has-error" : ""}`}
                                    value={formData.latitude}
                                    onChange={handleInputChange}
                                />
                                {fieldErrors.latitude && (
                                    <div className="field-error">{fieldErrors.latitude}</div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="longitude">Longitude (-180 to 180)</label>
                                <input
                                    id="longitude"
                                    type="number"
                                    name="longitude"
                                    step="any"
                                    placeholder="e.g. 77.5945627"
                                    className={`form-input ${fieldErrors.longitude ? "has-error" : ""}`}
                                    value={formData.longitude}
                                    onChange={handleInputChange}
                                />
                                {fieldErrors.longitude && (
                                    <div className="field-error">{fieldErrors.longitude}</div>
                                )}
                            </div>
                        </div>
                        <div className="help-text" style={{ marginTop: "-10px", marginBottom: "20px" }}>
                            Accurate coordinates help the matching engine calculate real-time distance and prioritize food pickups near you.
                        </div>

                        <button
                            type="submit"
                            className="save-btn"
                            disabled={saving}
                        >
                            {saving ? "Saving Changes..." : "Save Matching Profile"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default NGOProfile;
