from collections import Counter
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import RandomOverSampler

pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)


file_path = 'student_performance_riskly.csv'
df = pd.read_csv(file_path)



one_hot_encoded = pd.get_dummies(df, columns=['Gender'])

encoder = LabelEncoder()
one_hot_encoded['Parental_Support_level'] = encoder.fit_transform(one_hot_encoded['ParentalSupport'])


one_hot_encoded.drop('ParentalSupport', axis=1, inplace=True)

one_hot_encoded["DropoutRisk"] = one_hot_encoded.apply(lambda row: 1 if row["AttendanceRate"] < 50 or row["Parental_Support_level"]<3 or row["FinalGrade"] < 60 or row["StudyHoursPerWeek"]<8 else 0, axis=1)
one_hot_encoded["Underperform"] = one_hot_encoded["FinalGrade"].apply(lambda x: 1 if x < 70 else 0)

feature_cols = ['AttendanceRate', 'StudyHoursPerWeek', 'PreviousGrade', 'FinalGrade']

scaler = StandardScaler()
one_hot_encoded[feature_cols] = scaler.fit_transform(one_hot_encoded[feature_cols])

print(one_hot_encoded)

dropout_counts = one_hot_encoded['DropoutRisk'].value_counts().sort_index()

plt.figure(figsize=(6, 4))
plt.bar(dropout_counts.index.astype(str), dropout_counts.values, width=0.4, color=['green', 'red'])

plt.xlabel('Dropout Risk (0 = No, 1 = Yes)')
plt.ylabel('Number of Students')
plt.title('Dropout Risk Distribution')
plt.xticks(ticks=[0, 1], labels=['No Risk', 'At Risk'])
plt.grid(axis='y', linestyle='--', alpha=0.7)

plt.tight_layout()
plt.show()


y = one_hot_encoded['DropoutRisk']
X = one_hot_encoded.drop(['DropoutRisk', 'Underperform'], axis=1)


X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

oversampler = RandomOverSampler(random_state=42)
X_train_oversampled, y_train_oversampled = oversampler.fit_resample(X_train, y_train)

dropout_counts_over = Counter(y_train_oversampled)

# Plot
plt.figure(figsize=(6, 4))
plt.bar(
    [str(k) for k in dropout_counts_over.keys()],
    dropout_counts_over.values(),
    width=0.4,
    color=['green', 'red']
)

plt.xlabel('Dropout Risk (0 = No, 1 = Yes)')
plt.ylabel('Number of Students')
plt.title('Dropout Risk Distribution After Oversampling')
plt.xticks(ticks=[0, 1], labels=['No Risk', 'At Risk'])
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.show()



