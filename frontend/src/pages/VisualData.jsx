import { useState,useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import '../styles/chartStyle.css'

export default function VisualData(){
    const [data,setData] = useState([{}])
    const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 600);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    //https://nba-predictions-uyk0.onrender.com/nba_predictions
    //http://127.0.0.1:5000/nba_predictions
    useEffect(() => {
        fetch("https://nba-predictions-uyk0.onrender.com/nba_predictions").then(
            res => res.json()
        ).then(
            data => {
                setData(data)
                console.log(data)
            }
        )
    },[])

    const containerWidth = isMobile ? "100%" : "25%";
    const containerHeight = isMobile ? "25%" : "100%"; // 150px for mobile, 100% for desktop

    return(
        <div className = "displays">
            
            <div className="charts">
                <ResponsiveContainer  className = "flexContainer" width={containerWidth} height={containerHeight}>
                    <ScatterChart   margin={{ top: 20, right: 20, bottom: 50, left: 30 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[28.5,35]} stroke="#000000" strokeWidth={2}
                                label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5, fill: "#000000", }}
                                />
                                <YAxis type="number" dataKey="pts_per_game" name="PPG" domain={[6.5,38]} stroke="#000000" strokeWidth={2}
                                label={{ value: "PPG", position: "outsideLeft", offset: -5, angle: -90, dx: -20, fill: "#000000", }}
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
                
                <ResponsiveContainer  className = "flexContainer"  width={containerWidth} height={containerHeight}>
                    <ScatterChart  margin={{ top: 20, right: 20, bottom: 50, left: 30 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[28.5,35]} stroke="#000000" strokeWidth={2} 
                        label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5, fill: "#000000", }}
                        />
                        <YAxis type="number" dataKey="ast_per_game" name="APG" domain={[1,14]} stroke="#000000" strokeWidth={2}
                        label={{ value: "APG", position: "outsideLeft", offset: -25, angle: -90, dx: -20, fill: "#000000", }}
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

                <ResponsiveContainer className = "flexContainer" width={containerWidth} height={containerHeight}>
                    <ScatterChart   margin={{ top: 20, right: 20, bottom: 50, left: 30 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[28.5,35]} stroke="#000000" strokeWidth={2}
                        label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5, fill: "#000000", }}
                        />
                        <YAxis type="number" dataKey="trb_per_game" name="RPG" domain={[2,15]} stroke="#000000" strokeWidth={2}
                        label={{ value: "RPG", position: "outsideLeft", offset: -25, angle: -90, dx: -20, fill: "#000000", }}
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

                <ResponsiveContainer  className = "flexContainer" width={containerWidth} height={containerHeight}>
                    <ScatterChart  margin={{ top: 20, right: 20, bottom: 50, left: 30 }}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="mp_per_game" name="Minutes Per Game" domain={[28.5,35]} stroke="#000000" strokeWidth={2}
                        label={{ value: "Minutes Per Game", position: "insideBottom", offset: -5, fill: "#000000", }}
                        />
                        <YAxis type="number" dataKey="fg_per_game" name="FGM Per Game" domain={[2,15]} stroke="#000000" strokeWidth={2}
                        label={{ value: "FGM", position: "outsideLeft", offset: -25, angle: -90, dx: -20, fill: "#000000", }}
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