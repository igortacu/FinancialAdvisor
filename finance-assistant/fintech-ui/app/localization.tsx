import { useEffect, useState } from "react";
    

export default function localization() {
    const [amount, setAmount] = useState(50);
    const [formattedCurrency, setFormattedCurrency] = useState("");
    const [formattedCurrencyRO, setFormattedCurrencyRO] = useState("");

    const [formattedDate, setFormattedDate] = useState("");

    const [formattedNumber, setFormattedNumber] = useState("");

   
    useEffect(() => {

        //Curency Formatter MDL
        const mdlFormatter = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "MDL",
        }).format(amount);
        setFormattedCurrency(mdlFormatter);

        const roFormatter = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "RON",
        }).format(amount);
        setFormattedCurrencyRO(roFormatter);

        const numFormatter = new Intl.NumberFormat("ro-MD").format(amount * 1234.567);
        setFormattedNumber(numFormatter);

        const dateFormatter = new Intl.DateTimeFormat("ro-MD", {
            dateStyle: "full",
            timeStyle: "short",
        }).format(new Date());

        setFormattedDate(dateFormatter);

    }, [amount]);

    return (
        <div className="p-4 space-y-3 text-lg">
            <h2 className="font-bold text-xl"> Localization (ro-MD)</h2>

            <div>
                <strong> Currency (MDL): </strong>
                <span>{formattedCurrency}</span>
            </div>

            <div>
                <strong> Currency (RO): </strong>
                <span>{formattedCurrencyRO}</span>
            </div>
            <div>
                <strong> Number: </strong>
                <span>{formattedNumber}</span>
            </div>

            <div>
                <strong> Date & Time: </strong>
                <span>{formattedDate}</span>
            </div>

            <input
                type="range"
                min="0"
                max="1000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full mt-3"
            />
        </div>
    );
}