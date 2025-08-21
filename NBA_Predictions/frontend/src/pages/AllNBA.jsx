import { useState, useEffect } from "react"
import "../styles/inputStyle.css"

export default function AllNBA(){
    const [form,setForm] = useState({
        pts_per_game: "",
        trb_per_game: "",
        ast_per_game: "",
        g: "",
        mp_per_game: "",
        fg_per_game: "",
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
        parseFloat(form.mp_per_game),
        parseFloat(form.fg_per_game)
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
        setForm({pts_per_game: "",trb_per_game: "",ast_per_game: "",g: "",mp_per_game: "", fg_per_game: ""})
    } catch (error) {
        console.error("Error:", error);
    }
    };

    return(
        
        <div className = "topContainer">
            <h1>All-NBA Data</h1>
            <p id = "basicDesc"> Data is taken from 1000 random players in the modern NBA history. 
                Blue dots are All-NBA players while red are not. 
                <strong>!!! Cold Starts could take 1-2 minutes due to free API usage !!!</strong></p>
            <div className = "inputContent">
<p id ="inputInfo"> <strong>How to use:</strong> Enter Per Game Average of each stats and press submit to see if a player with those stats would be considered All-NBA. 
                Prediction model is based of all players in modern NBA (1976-Current) with atleast 5 games in a season. 
                ESPN has all data metrics of all NBA players so you can test. <strong>!!! Real Life All-NBA players might not always be predicted as All-NBA if they have underwhelming stats (model has 98% accuracy rating)!!!</strong></p>
            <form className = "inputForm" onSubmit={handleSubmit}>
                <div className = "inputStyling">
                    <p>Points Per Game</p>
                    <input
                    className = "inputForms"
                    type="text"
                    value = {form.pts_per_game}
                    placeholder="EX: 27.2"
                    onChange={(e) => handleChange("pts_per_game", e.target.value)}
                    required>
                    </input>
                </div>

                <div className = "inputStyling">
                    <p>Rebounds Per Game</p>
                    <input
                    className = "inputForms"
                    type="text"
                    value = {form.trb_per_game}
                    placeholder="EX: 10.1"
                    onChange={(e) => handleChange("trb_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                
                <div className = "inputStyling">
                    <p>Assist Per Game</p>
                    <input
                    className = "inputForms"
                    type="text"
                    value = {form.ast_per_game}
                    placeholder="EX: 6.1"
                    onChange={(e) => handleChange("ast_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                
                <div className = "inputStyling">
                    <p >Games</p>
                    <input
                    id = "games"
                    className = "inputForms"
                    type="text"
                    value = {form.g}
                    placeholder="EX: 76"
                    onChange={(e) => handleChange("g", e.target.value)}
                    required>
                    </input>
                </div>
                    
                <div className = "inputStyling">
                    <p>Minutes Per Game</p>
                    <input
                    className = "inputForms"
                    type="text"
                    value = {form.mp_per_game}
                    placeholder="EX: 34.1"
                    onChange={(e) => handleChange("mp_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                
                <div className = "inputStyling">
                    <p>FGM Per Game</p>
                    <input
                    className = "inputForms"
                    type="text"
                    value = {form.fg_per_game}
                    placeholder="EX: 10.1"
                    onChange={(e) => handleChange("fg_per_game", e.target.value)}
                    required>
                    </input>
                </div>
                
                <button id = "submitButton">
                    Submit
                </button>
                
            </form>

            {prediction !== null && (
                <div className = "predictionResult">
                    <h2>Prediction Result:</h2>
                    {prediction > 0.5 ? (
                    <h3>All-NBA / {`${Math.round(prediction * 100)}% chance player is All-NBA`}</h3>
                    ) : (
                    <h3>  Not All-NBA / {`${Math.round(prediction * 100)}% chance player is All-NBA`}</h3>
                    )}
                    <p>Disclaimer: Percentages are often lower than expected!!</p>
                </div>
            )}
            </div>
            
        </div>
    )
}