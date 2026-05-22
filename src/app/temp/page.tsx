
export const ArrayUI = ({ data, disabledElements, name, showIndex = true }: { data: string[] | number[]; disabledElements: number[]; name: string; showIndex: boolean }) => {
  return (
    <div className="flex gap-3 h-[400px] w-full items-center justify-center rounded-xl ">
      {name && (<div className="flex gap-2 items-center">
        <h2 className="text-lg font-medium">{name}</h2>
        <h2 className="text-lg font-medium">=</h2>
      </div>)}
      {data.map((item, index) => (
        <div key={index} className="flex flex-col gap-1 items-center justify-center">
          <div className={`border-2 p-4 text-black flex flex-col items-center justify-center border-white bg-amber-50 rounded-md ${disabledElements.includes(index) ? 'opacity-20 cursor-not-allowed' : ''} size-10`}>
            {item}
          </div>
          {showIndex &&
            <p className="text-sm text-muted-foreground">
              {index}
              {/* {name}[{index}] */}
            </p>
          }
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const data = ["a", "b", "c", "d", "e"];

  return (
    <div className=" flex flex-1 flex-col gap-2">
      <ArrayUI data={data} disabledElements={[0, 1, 3, 4]} name="Arr" showIndex={true} />

    </div>
  )
}
