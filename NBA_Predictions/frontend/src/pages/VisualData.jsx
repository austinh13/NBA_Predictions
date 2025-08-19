import { useState,useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
            <p>Data is taken from 1000 random players in the modern NBA history. Blue dots are All-NBA players while red are not. Emmitted anaomly values</p>
            <div className="charts">
                <ResponsiveContainer  width="25%" height="100%">
                    <ScatterChart width={450} height={350}   margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[25,35]} 
                                label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5 }}
                                />
                                <YAxis type="number" dataKey="pts_per_game" name="PPG" domain={[6.5,55]}
                                label={{ value: "PPG", position: "outsideLeft", offset: -5, angle: -90, dx: -15 }}
                                />
                                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                                <Scatter
                                    data={data}
                                    shape={(props) => {
                                    const { cx, cy, payload } = props;
                                    const color = payload.type === 1 ? "blue" : "red";
                                    const size = payload.type === 1 ? 4 : 2;
                                    return <circle cx={cx} cy={cy} r={size} fill={color} />;
                                    }}
                                />
                    </ScatterChart>
                </ResponsiveContainer >
                
                <ResponsiveContainer  width="25%" height="100%">
                    <ScatterChart width={450} height={350}   margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[25,35]} 
                        label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis type="number" dataKey="ast_per_game" name="APG" domain={[1,15]}
                        label={{ value: "APG", position: "outsideLeft", offset: -25, angle: -90, dx: -15 }}
                        />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter
                            data={data}
                            shape={(props) => {
                            const { cx, cy, payload } = props;
                            const color = payload.type === 1 ? "blue" : "red";
                            const size = payload.type === 1 ? 4 : 2;
                            return <circle cx={cx} cy={cy} r={size} fill={color} />;
                            }}
                        />
                    </ScatterChart>
                </ResponsiveContainer>

                <ResponsiveContainer  width="25%" height="100%">
                    <ScatterChart width={450} height={350}   margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[25,35]} 
                        label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis type="number" dataKey="trb_per_game" name="RPG" domain={[2,15]}
                        label={{ value: "RPG", position: "outsideLeft", offset: -25, angle: -90, dx: -15 }}
                        />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter
                            data={data}
                            shape={(props) => {
                            const { cx, cy, payload } = props;
                            const color = payload.type === 1 ? "blue" : "red";
                            const size = payload.type === 1 ? 4 : 2;
                            return <circle cx={cx} cy={cy} r={size} fill={color} />;
                            }}
                        />
                    </ScatterChart>
                </ResponsiveContainer>

                <ResponsiveContainer  width="25%" height="100%">
                    <ScatterChart width={450} height={350}   margin={{ top: 20, right: 20, bottom: 50, left: 50 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[25,35]} 
                        label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis type="number" dataKey="fg_per_game" name="FGM Per Game" domain={[0,19]}
                        label={{ value: "FGM", position: "outsideLeft", offset: -25, angle: -90, dx: -15 }}
                        />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter
                            data={data}
                            shape={(props) => {
                            const { cx, cy, payload } = props;
                            const color = payload.type === 1 ? "blue" : "red";
                            const size = payload.type === 1 ? 4 : 2;
                            return <circle cx={cx} cy={cy} r={size} fill={color} />;
                            }}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
                

                

               
            </div>
            
    </div>

    )
}