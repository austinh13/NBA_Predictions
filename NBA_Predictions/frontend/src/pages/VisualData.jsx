import { useState,useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import '../styles/chartStyle.css'

export default function VisualData(){
    const [data,setData] = useState([{}])

    useEffect(() => {
        fetch("http://localhost:5000/nba_predictions").then(
            res => res.json()
        ).then(
            data => {
                setData(data)
                console.log(data)
            }
        )
    },[])

    return(
        <div className = "displays">
            <h1>All-NBA Data</h1>
            <p>Data is taken from random historical data (1947-Current). Blue dots are All-NBA players while red are not. Chart only shows 800/32,000 values for clarity. Emmitted anaomly values</p>
            <div className="charts">
                <ScatterChart width={500} height={350}   margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="age" name="Age" domain={[17,45]} 
                            label={{ value: "Player Age", position: "insideBottom", offset: -5 }}
                            />
                            <YAxis type="number" dataKey="pts_per_game" name="PPG" domain={[6.5,55]}
                            label={{ value: "PPG", position: "outsideLeft", offset: -5 }}
                            />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                            <Scatter
                                data={data}
                                shape={(props) => {
                                const { cx, cy, payload } = props;
                                const color = payload.type === 1 ? "blue" : "red";
                                const size = payload.type === 1 ? 8 : 4;
                                return <circle cx={cx} cy={cy} r={size} fill={color} />;
                                }}
                            />
                </ScatterChart>

                <ScatterChart width={500} height={350}   margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="age" name="Age" domain={[17,45]} 
                            label={{ value: "Player Age", position: "insideBottom", offset: -5 }}
                            />
                            <YAxis type="number" dataKey="ast_per_game" name="APG" domain={[1,15]}
                            label={{ value: "APG", position: "outsideLeft", offset: -25 }}
                            />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                            <Scatter
                                data={data}
                                shape={(props) => {
                                const { cx, cy, payload } = props;
                                const color = payload.type === 1 ? "blue" : "red";
                                const size = payload.type === 1 ? 8 : 4;
                                return <circle cx={cx} cy={cy} r={size} fill={color} />;
                                }}
                            />
                </ScatterChart>

                <ScatterChart width={500} height={350}   margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="age" name="Age" domain={[17,45]} 
                            label={{ value: "Player Age", position: "insideBottom", offset: -5 }}
                            />
                            <YAxis type="number" dataKey="trb_per_game" name="RPG" domain={[2,15]}
                            label={{ value: "RPG", position: "outsideLeft", offset: -25 }}
                            />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                            <Scatter
                                data={data}
                                shape={(props) => {
                                const { cx, cy, payload } = props;
                                const color = payload.type === 1 ? "blue" : "red";
                                const size = payload.type === 1 ? 8 : 4;
                                return <circle cx={cx} cy={cy} r={size} fill={color} />;
                                }}
                            />
                </ScatterChart>
            </div>
            
    </div>

    )
}