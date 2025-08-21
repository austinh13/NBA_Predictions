import { useState, useEffect } from "react"
import "../styles/inputStyle.css"

export default function AllNBA(){
    const [form,setForm] = useState({
        pts_per_game: "",
        trb_per_game: "",
        ast_per_game: "",
        g: "",
        gs: "",
        mp_per_game: "",
        fg_per_game: "",
        fg_percent: ""
    })

    const [prediction,setPrediction] = useState(null)

    const handleChange = (field,value) => {
        setForm(prev => ({...prev,[field]:value}));
    };


        const handleSubmit = async (e) => {
    e.preventDefault();

    const features = [
        parseFloat(form.pts_per_game),
        parseFloat(form.trb_per_game),
        parseFloat(form.ast_per_game),
        parseFloat(form.g),
        parseFloat(form.gs),
        parseFloat(form.mp_per_game),
        parseFloat(form.fg_per_game),
        parseFloat(form.fg_percent)
    ];

    //https://nba-predictions-uyk0.onrender.com/predict_user_input
    //http://127.0.0.1:5000/predict_user_input
    try {
        const response = await fetch("https://nba-predictions-uyk0.onrender.com/predict_user_input", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ features }),
        });

        const data = await response.json();
        console.log("Server response:", data);
        setPrediction(data.prediction)
    } catch (error) {
        console.error("Error:", error);
    }
    };

    return(
        <div className = "inputContent">
            <form className = "inputForm" onSubmit={handleSubmit}>
                <div className = "inputStyling">
                    <p>Points Per Game</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("pts_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                

                <div className = "inputStyling">
                    <p>Rebounds Per Game</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("trb_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                

                <div className = "inputStyling">
                    <p>Assist Per Game</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("ast_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                

                <div className = "inputStyling">
                    <p>Games</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("g", e.target.value)}
                    required>
                    </input>
                </div>
                

                <div className = "inputStyling">
                    <p>Games Started</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("gs", e.target.value)}
                    required>
                    </input>
                </div>
                
                <div className = "inputStyling">
                    <p>Minutes Per Game</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("mp_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                

                <div className = "inputStyling">
                    <p>FGM Per Game</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("fg_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                

                <div className = "inputStyling">
                    <p>Field Goal Percent</p>
                    <input
                    type="text"
                    onChange={(e) => handleChange("fg_percent", e.target.value)}
                    required>
                    </input>
                </div>

                <button>
                    Submit
                </button>
                
            </form>

            {prediction !== null && (
                <div className = "predictionResult">
                    <h2>Prediction Result:</h2>
                    {prediction > 0.5 ? (
                    <h3>All-NBA</h3>
                    ) : (
                    <h3>Not All-NBA</h3>
                    )}
                    <h4>{Math.round(prediction * 100) + "% chance player is All-NBA"}</h4>
                    <p>Disclaimer: Percentages are often lower than expected!!</p>
                </div>
            )}
        </div>
    )
}