import os
import opendatasets as od

# Get the directory where the current script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# URL of the Kaggle dataset
dataset_url = "https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats/"

# Download the dataset into the same folder
od.download(dataset_url, data_dir=script_dir)

import pandas as pd

all_nba_df = pd.read_csv("nba-aba-baa-stats/End of Season Teams.csv")
stats_df = pd.read_csv("nba-aba-baa-stats/Player Per Game.csv")

all_nba_df = all_nba_df[all_nba_df["type"] == "All-NBA"]
all_nba_df["type"] = 1


merged_df = stats_df.merge(
    all_nba_df[["season","player_id","type"]],
    on = ["season","player_id"],
    how ="left"
)

merged_df["type"] = merged_df["type"].fillna(0).astype(int)

print(merged_df.head())