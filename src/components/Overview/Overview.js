import "./Overview.css"

export const Overview = (props) => {
  const epochToDate = (epoch) => {
    const date = new Date(Number(epoch) * 1000)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const data = props.data
  return (
    <div className="overviewDiv">
      <div className="overviewWrappDiv">
        <div className="overviewWrappedDiv">
          <div className="headerTitle">
            <span>What is {data.name} ?</span>
          </div>
          <div className="dateDiv">
            <span>Launched on &emsp;{epochToDate(data.launch)}</span>
            <br />
            <span>Added&emsp;&emsp;&emsp;&emsp;&nbsp;&nbsp;{epochToDate(data.listed)}</span>
          </div>
          <div className="descriptionDiv">
            <span>{data.description}</span>
          </div>

          <div className="videoDiv">
            <video controls width="100%">
              <source src={data.videolink} type="video/mp4" />
            </video>
          </div>

          <div className="overviewTitleDiv">
            <div className="overviewTitleWrappedDiv">Overview</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
