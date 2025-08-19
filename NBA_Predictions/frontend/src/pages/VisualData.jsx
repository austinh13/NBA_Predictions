import { useState,useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

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
        <div>
      <ScatterChart width={500} height={350}>
        <CartesianGrid />
        <XAxis type="number" dataKey="age" name="Age" domain={[17,45]} 
        label={{ value: "Player Age", position: "insideBottom", offset: -5 }}
        />
        <YAxis type="number" dataKey="pts_per_game" name="PPG" domain={[7,55]}
        label={{ value: "PPG", position: "insideBottom", offset: -5 }}
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

    )
}